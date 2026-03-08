"use client";

import {type JSX, useEffect, useMemo, useRef, useState} from "react";
import type {FieldValues} from "react-hook-form";
import type {RHFErrorCompat} from "../../models/core/formModels";
import {FormError} from "./Helpers/FormError";

export type MapLocationValue = {
    lat: number;
    lng: number;
    zoom?: number;
};

export type MapProvider = "google" | "openstreetmap";

export type GoogleMapProviderConfig = {
    apiKey: string;
    mapId?: string;
    language?: string;
    region?: string;
};

export type OpenStreetMapProviderConfig = {
    tileUrl?: string;
    tileAttribution?: string;
    maxZoom?: number;
};

export type MapLocationPickerProviderConfig = {
    google?: GoogleMapProviderConfig;
    openstreetmap?: OpenStreetMapProviderConfig;
};

export interface MapLocationPickerProps<TFormValues extends FieldValues = FieldValues> {
    provider: MapProvider;
    providerConfig?: MapLocationPickerProviderConfig;
    value?: MapLocationValue | null;
    defaultValue?: MapLocationValue;
    onChange?: (location: MapLocationValue) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    heightPx?: number;
    defaultZoom?: number;
    enableScrollWheelZoom?: boolean;
    markerDraggable?: boolean;
    markerIconUrl?: string;
    markerIconSizePx?: number;
    error?: RHFErrorCompat<TFormValues>;
    showCoordinates?: boolean;
}

type MapAdapter = {
    setLocation: (next: MapLocationValue) => void;
    setDisabled: (disabled: boolean) => void;
    refreshLayout?: () => void;
    destroy: () => void;
};

type WindowWithMaps = Window & {
    google?: any;
    L?: any;
};

const DEFAULT_LOCATION: MapLocationValue = {lat: 24.7136, lng: 46.6753, zoom: 12};

const DEFAULT_OSM_TILE_URL =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const DEFAULT_OSM_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const DEFAULT_MARKER_ICON_URL =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2234%22%20height%3D%2234%22%20viewBox%3D%220%200%2034%2034%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M17%201.8C9.18%201.8%202.8%208.18%202.8%2016c0%2010.41%2012.41%2016.41%2013.05%2016.71a2.5%202.5%200%200%200%202.3%200C18.79%2032.41%2031.2%2026.41%2031.2%2016%2031.2%208.18%2024.82%201.8%2017%201.8Z%22%20fill%3D%22%232563EB%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%226.2%22%20fill%3D%22white%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%223.2%22%20fill%3D%22%232563EB%22/%3E%3C/svg%3E";

const LEAFLET_SCRIPT_ID = "shared-map-picker-leaflet-script";
const LEAFLET_CSS_ID = "shared-map-picker-leaflet-css";
const MAP_DEBUG = false;

let leafletLoaderPromise: Promise<any> | null = null;

const debugMap = (...args: unknown[]): void => {
    if (!MAP_DEBUG) return;
    console.log("[MapLocationPicker]", ...args);
};

const getElementSummary = (element: EventTarget | null): string => {
    if (!(element instanceof HTMLElement)) return "unknown";
    const className = typeof element.className === "string" ? element.className : "";
    return `${element.tagName.toLowerCase()}${className ? `.${className.replace(/\s+/g, ".")}` : ""}`;
};

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const normalizeLocation = (
    location: MapLocationValue | null | undefined,
    fallbackZoom: number,
): MapLocationValue => {
    const source = location ?? DEFAULT_LOCATION;

    const lat = isFiniteNumber(source.lat) ? source.lat : DEFAULT_LOCATION.lat;
    const lng = isFiniteNumber(source.lng) ? source.lng : DEFAULT_LOCATION.lng;
    const zoom = isFiniteNumber(source.zoom) ? source.zoom : fallbackZoom;

    return {lat, lng, zoom};
};

const resetLeafletContainer = (container: HTMLDivElement): void => {
    const stamped = container as HTMLDivElement & { _leaflet_id?: number };

    if (stamped._leaflet_id !== undefined) {
        delete stamped._leaflet_id;
    }

    // Clear any stale Leaflet DOM from previous instances (common in modal reopen cycles).
    container.innerHTML = "";
};

const loadScript = (id: string, src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLScriptElement | null;

        if (existing) {
            resolve();
            return;
        }

        const script = document.createElement("script");

        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));

        document.head.appendChild(script);
    });
};

const loadStylesheet = (id: string, href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLLinkElement | null;

        if (existing) {
            resolve();
            return;
        }

        const link = document.createElement("link");

        link.id = id;
        link.rel = "stylesheet";
        link.href = href;

        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));

        document.head.appendChild(link);
    });
};

const loadLeaflet = async (): Promise<any> => {
    const win = window as WindowWithMaps;

    if (win.L) return win.L;

    if (!leafletLoaderPromise) {
        leafletLoaderPromise = Promise.all([
            loadStylesheet(
                LEAFLET_CSS_ID,
                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
            ),
            loadScript(
                LEAFLET_SCRIPT_ID,
                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
            ),
        ]).then(() => {
            const loaded = (window as WindowWithMaps).L;

            if (!loaded) {
                throw new Error("Leaflet API loaded but window.L is unavailable");
            }

            return loaded;
        });
    }

    return leafletLoaderPromise;
};

const createOpenStreetMapAdapter = async (
    {
        container,
        initialLocation,
        disabled,
        config,
        enableScrollWheelZoom,
        markerDraggable,
        markerIconUrl,
        markerIconSizePx,
        onLocationChange,
        canInitialize,
    }: {
        container: HTMLDivElement;
        initialLocation: MapLocationValue;
        disabled: boolean;
        config?: OpenStreetMapProviderConfig;
        enableScrollWheelZoom: boolean;
        markerDraggable: boolean;
        markerIconUrl?: string;
        markerIconSizePx: number;
        onLocationChange: (location: MapLocationValue) => void;
        canInitialize?: () => boolean;
    }): Promise<MapAdapter> => {

    const L = await loadLeaflet();
    if (canInitialize && !canInitialize()) {
        throw new Error("OpenStreetMap initialization canceled");
    }

    resetLeafletContainer(container);

    debugMap("createOpenStreetMapAdapter:start", {
        existingLeafletPanes: container.querySelectorAll(".leaflet-map-pane").length,
        existingControlContainers: container.querySelectorAll(".leaflet-control-container").length,
        existingMarkerPanes: container.querySelectorAll(".leaflet-marker-pane").length,
        childCount: container.childElementCount,
    });

    const map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
        dragging: !disabled,
        scrollWheelZoom: enableScrollWheelZoom && !disabled,
    }).setView([initialLocation.lat, initialLocation.lng], initialLocation.zoom);
    if (canInitialize && !canInitialize()) {
        map.remove();
        resetLeafletContainer(container);
        throw new Error("OpenStreetMap initialization canceled");
    }

    debugMap("createOpenStreetMapAdapter:after-map-init", {
        leafletPanes: container.querySelectorAll(".leaflet-map-pane").length,
        controlContainers: container.querySelectorAll(".leaflet-control-container").length,
        markerPanes: container.querySelectorAll(".leaflet-marker-pane").length,
    });

    const tileLayer = L.tileLayer(config?.tileUrl ?? DEFAULT_OSM_TILE_URL, {
        attribution: config?.tileAttribution ?? DEFAULT_OSM_ATTRIBUTION,
        maxZoom: config?.maxZoom ?? 19,
    });

    tileLayer.addTo(map);

    const markerSize = Math.max(20, markerIconSizePx);

    const markerIcon = L.icon({
        iconUrl: markerIconUrl ?? DEFAULT_MARKER_ICON_URL,
        iconSize: [markerSize, markerSize],
        iconAnchor: [Math.round(markerSize / 2), markerSize],
    });

    const marker = L.marker([initialLocation.lat, initialLocation.lng], {
        draggable: markerDraggable && !disabled,
        icon: markerIcon,
    }).addTo(map);

    let isDisabled = disabled;
    let isDraggingMap = false;
    let lastDragEndedAtMs = 0;

    const emit = (lat: number, lng: number) => {
        onLocationChange({
            lat,
            lng,
            zoom: map.getZoom(),
        });
    };

    /* ------------------------------------------------------------------
       CLICK vs DRAG DETECTION
       ------------------------------------------------------------------

       The bug occurred because Leaflet fires a "click" event after
       a drag operation finishes.

       We detect whether the pointer moved more than a few pixels.
       If movement occurred we treat the action as a drag and ignore
       the click event.

       This allows smooth panning while preventing marker placement.
    ------------------------------------------------------------------ */

    let pointerDownPosition: { x: number; y: number } | null = null;
    let didMove = false;
    const MOVE_THRESHOLD = 5;

    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;

        pointerDownPosition = {
            x: event.clientX,
            y: event.clientY,
        };

        didMove = false;

        debugMap("pointerdown", {
            x: event.clientX,
            y: event.clientY,
            button: event.button,
            pointerType: event.pointerType,
            target: getElementSummary(event.target),
        });
    };

    const onPointerMove = (event: PointerEvent) => {
        if (!pointerDownPosition) return;

        const dx = Math.abs(event.clientX - pointerDownPosition.x);
        const dy = Math.abs(event.clientY - pointerDownPosition.y);

        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            didMove = true;
        }

        if (MAP_DEBUG) {
            debugMap("pointermove", {
                x: event.clientX,
                y: event.clientY,
                dx,
                dy,
                didMove,
                target: getElementSummary(event.target),
            });
        }
    };

    const onPointerUp = (event: PointerEvent) => {
        debugMap("pointerup", {
            x: event.clientX,
            y: event.clientY,
            didMove,
            target: getElementSummary(event.target),
        });

        pointerDownPosition = null;
    };

    const onPointerCancel = (event: PointerEvent) => {
        debugMap("pointercancel", {
            x: event.clientX,
            y: event.clientY,
            target: getElementSummary(event.target),
        });
        pointerDownPosition = null;
    };

    container.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);

    map.on("dragstart", () => {
        isDraggingMap = true;
        debugMap("leaflet:dragstart");
    });

    map.on("drag", () => {
        if (MAP_DEBUG) debugMap("leaflet:drag");
    });

    map.on("dragend", () => {
        isDraggingMap = false;
        lastDragEndedAtMs = Date.now();
        debugMap("leaflet:dragend");
    });

    if (MAP_DEBUG) {
        map.on("mousedown", (event: any) => {
            debugMap("leaflet:mousedown", {
                latlng: event?.latlng,
                originalTarget: getElementSummary(event?.originalEvent?.target ?? null),
            });
        });

        map.on("movestart", () => {
            debugMap("leaflet:movestart");
        });

        map.on("move", () => {
            const center = map.getCenter();
            debugMap("leaflet:move", {
                lat: center.lat,
                lng: center.lng,
                zoom: map.getZoom(),
            });
        });

        map.on("moveend", () => {
            const center = map.getCenter();
            debugMap("leaflet:moveend", {
                lat: center.lat,
                lng: center.lng,
                zoom: map.getZoom(),
            });
        });
    }

    map.on("click", (event: any) => {

        if (isDisabled) return;
        const recentlyDragged = Date.now() - lastDragEndedAtMs < 150;
        const shouldIgnoreAsDrag = didMove || isDraggingMap || recentlyDragged;

        debugMap("leaflet:click", {
            latlng: event?.latlng,
            didMove,
            isDraggingMap,
            recentlyDragged,
            originalTarget: getElementSummary(event?.originalEvent?.target ?? null),
        });

        // Reset movement flag for the next pointer cycle.
        didMove = false;

        if (shouldIgnoreAsDrag) return;

        const lat = event?.latlng?.lat;
        const lng = event?.latlng?.lng;

        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;

        marker.setLatLng([lat, lng]);

        emit(lat, lng);
    });

    if (markerDraggable) {
        if (MAP_DEBUG) {
            marker.on("mousedown", (event: any) => {
                debugMap("marker:mousedown", {
                    latlng: event?.latlng,
                    originalTarget: getElementSummary(event?.originalEvent?.target ?? null),
                });
            });

            marker.on("dragstart", () => {
                debugMap("marker:dragstart");
            });
        }

        marker.on("dragend", () => {
            if (isDisabled) return;

            const point = marker.getLatLng();
            debugMap("marker:dragend", point);

            emit(point.lat, point.lng);
        });
    }

    setTimeout(() => map.invalidateSize(), 0);
    setTimeout(() => map.invalidateSize(), 200);

    return {
        setLocation: (next: MapLocationValue) => {
            marker.setLatLng([next.lat, next.lng]);
            map.setView(
                [next.lat, next.lng],
                isFiniteNumber(next.zoom) ? next.zoom : map.getZoom(),
            );
        },

        setDisabled: (nextDisabled: boolean) => {
            isDisabled = nextDisabled;

            if (nextDisabled) {
                map.dragging.disable();
                map.touchZoom.disable();
                map.doubleClickZoom.disable();
                map.scrollWheelZoom.disable();
                map.boxZoom.disable();
                map.keyboard.disable();
                marker.dragging?.disable();
            } else {
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                if (enableScrollWheelZoom) {
                    map.scrollWheelZoom.enable();
                } else {
                    map.scrollWheelZoom.disable();
                }
                map.boxZoom.enable();
                map.keyboard.enable();
                if (markerDraggable) marker.dragging?.enable();
            }
        },

        refreshLayout: () => {
            map.invalidateSize();
        },

        destroy: () => {
            debugMap("createOpenStreetMapAdapter:destroy:before", {
                leafletPanes: container.querySelectorAll(".leaflet-map-pane").length,
                controlContainers: container.querySelectorAll(".leaflet-control-container").length,
                markerPanes: container.querySelectorAll(".leaflet-marker-pane").length,
                childCount: container.childElementCount,
            });

            container.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("pointermove", onPointerMove, true);
            window.removeEventListener("pointerup", onPointerUp, true);
            window.removeEventListener("pointercancel", onPointerCancel, true);

            map.off();
            marker.remove();
            map.remove();

            resetLeafletContainer(container);

            debugMap("createOpenStreetMapAdapter:destroy:after", {
                leafletPanes: container.querySelectorAll(".leaflet-map-pane").length,
                controlContainers: container.querySelectorAll(".leaflet-control-container").length,
                markerPanes: container.querySelectorAll(".leaflet-marker-pane").length,
                childCount: container.childElementCount,
            });
        },
    };
};

export default function MapLocationPicker<TFormValues extends FieldValues = FieldValues>(
    {
        provider,
        providerConfig,
        value,
        defaultValue,
        onChange,
        label,
        className,
        disabled = false,
        heightPx = 320,
        defaultZoom = 12,
        enableScrollWheelZoom = false,
        markerDraggable = false,
        markerIconUrl,
        markerIconSizePx = 34,
        error,
        showCoordinates = true,
    }: MapLocationPickerProps<TFormValues>): JSX.Element {

    const mapRef = useRef<HTMLDivElement | null>(null);
    const adapterRef = useRef<MapAdapter | null>(null);
    const initRunRef = useRef<number>(0);

    const [internalLocation, setInternalLocation] = useState<MapLocationValue>(
        normalizeLocation(defaultValue, defaultZoom),
    );

    const currentLocation = useMemo(
        () => normalizeLocation(value ?? internalLocation, defaultZoom),
        [value, internalLocation, defaultZoom],
    );

    const emitLocation = (next: MapLocationValue) => {
        setInternalLocation(next);
        onChange?.(next);
    };

    useEffect(() => {
        if (provider !== "openstreetmap") return;
        if (!mapRef.current) return;

        let isCancelled = false;
        const runId = ++initRunRef.current;
        const container = mapRef.current;

        debugMap("initMap:start", {
            provider,
            disabled,
            markerDraggable,
            enableScrollWheelZoom,
            runId,
        });

        const init = async () => {
            try {
                const adapter = await createOpenStreetMapAdapter({
                    container,
                    initialLocation: currentLocation,
                    disabled,
                    config: providerConfig?.openstreetmap,
                    enableScrollWheelZoom,
                    markerDraggable,
                    markerIconUrl,
                    markerIconSizePx,
                    onLocationChange: emitLocation,
                    canInitialize: () => !isCancelled && runId === initRunRef.current,
                });

                if (isCancelled || runId !== initRunRef.current) {
                    adapter.destroy();
                    return;
                }

                adapterRef.current = adapter;
                adapter.setLocation(currentLocation);
                adapter.setDisabled(disabled);

                debugMap("initMap:success", {
                    provider,
                    runId,
                });
            } catch (error: unknown) {
                debugMap("initMap:error", {
                    provider,
                    runId,
                    error,
                });
            }
        };

        void init();

        return () => {
            isCancelled = true;
            debugMap("initMap:cleanup", {
                provider,
                runId,
            });
            adapterRef.current?.destroy();
            adapterRef.current = null;
        };

    }, [
        provider,
        providerConfig?.openstreetmap?.tileUrl,
        providerConfig?.openstreetmap?.tileAttribution,
        providerConfig?.openstreetmap?.maxZoom,
        markerDraggable,
        markerIconUrl,
        markerIconSizePx,
        enableScrollWheelZoom,
    ]);

    useEffect(() => {
        adapterRef.current?.setLocation(currentLocation);
    }, [currentLocation.lat, currentLocation.lng, currentLocation.zoom]);

    useEffect(() => {
        adapterRef.current?.setDisabled(disabled);
    }, [disabled]);

    return (
        <div className={className}>

            {label && (
                <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                </label>
            )}

            <div className="rounded-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700">

                <div
                    ref={mapRef}
                    style={{
                        height: `${heightPx}px`,
                        cursor: disabled ? "default" : "grab",
                    }}
                    className="w-full overflow-hidden rounded-md active:cursor-grabbing"
                />

            </div>

            {showCoordinates && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Lat: {currentLocation.lat.toFixed(6)} | Lng: {currentLocation.lng.toFixed(6)}
                </p>
            )}

            <FormError error={error}/>

        </div>
    );
}
