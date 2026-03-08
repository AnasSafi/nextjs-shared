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

let leafletLoaderPromise: Promise<any> | null = null;

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
    }): Promise<MapAdapter> => {

    const L = await loadLeaflet();

    resetLeafletContainer(container);

    const map = L.map(container, {
        zoomControl: true,
        attributionControl: true,
        dragging: !disabled,
        scrollWheelZoom: enableScrollWheelZoom && !disabled,
    }).setView([initialLocation.lat, initialLocation.lng], initialLocation.zoom);

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
        pointerDownPosition = {
            x: event.clientX,
            y: event.clientY,
        };
        didMove = false;
    };

    const onPointerMove = (event: PointerEvent) => {
        if (!pointerDownPosition) return;

        const dx = Math.abs(event.clientX - pointerDownPosition.x);
        const dy = Math.abs(event.clientY - pointerDownPosition.y);

        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            didMove = true;
        }
    };

    const onPointerUp = () => {
        pointerDownPosition = null;
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    map.on("click", (event: any) => {

        if (isDisabled) return;

        // Ignore click if pointer movement indicates a drag
        if (didMove) return;

        const lat = event?.latlng?.lat;
        const lng = event?.latlng?.lng;

        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;

        marker.setLatLng([lat, lng]);

        emit(lat, lng);
    });

    if (markerDraggable) {
        marker.on("dragend", () => {
            if (isDisabled) return;

            const point = marker.getLatLng();

            emit(point.lat, point.lng);
        });
    }

    setTimeout(() => map.invalidateSize(), 0);

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
                marker.dragging?.disable();
            } else {
                map.dragging.enable();
                if (markerDraggable) marker.dragging?.enable();
            }
        },

        refreshLayout: () => {
            map.invalidateSize();
        },

        destroy: () => {
            container.removeEventListener("pointerdown", onPointerDown);
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerup", onPointerUp);
            container.removeEventListener("pointercancel", onPointerUp);

            map.off();
            marker.remove();
            map.remove();
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

        if (!mapRef.current) return;

        const init = async () => {

            const adapter = await createOpenStreetMapAdapter({
                container: mapRef.current!,
                initialLocation: currentLocation,
                disabled,
                config: providerConfig?.openstreetmap,
                enableScrollWheelZoom,
                markerDraggable,
                markerIconUrl,
                markerIconSizePx,
                onLocationChange: emitLocation,
            });

            adapterRef.current = adapter;
        };

        init();

        return () => {
            adapterRef.current?.destroy();
            adapterRef.current = null;
        };

    }, []);

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