"use client";

import React, {type JSX, useEffect, useMemo, useRef, useState} from "react";
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
const DEFAULT_OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_MARKER_ICON_URL =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2234%22%20height%3D%2234%22%20viewBox%3D%220%200%2034%2034%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M17%201.8C9.18%201.8%202.8%208.18%202.8%2016c0%2010.41%2012.41%2016.41%2013.05%2016.71a2.5%202.5%200%200%200%202.3%200C18.79%2032.41%2031.2%2026.41%2031.2%2016%2031.2%208.18%2024.82%201.8%2017%201.8Z%22%20fill%3D%22%232563EB%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%226.2%22%20fill%3D%22white%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%223.2%22%20fill%3D%22%232563EB%22/%3E%3C/svg%3E";

const GOOGLE_SCRIPT_ID = "shared-map-picker-google-script";
const LEAFLET_SCRIPT_ID = "shared-map-picker-leaflet-script";
const LEAFLET_CSS_ID = "shared-map-picker-leaflet-css";

let googleLoaderPromise: Promise<any> | null = null;
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
    const stamped = container as HTMLDivElement & {_leaflet_id?: number};
    if (stamped._leaflet_id !== undefined) {
        delete stamped._leaflet_id;
    }
};

const loadScript = (id: string, src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLScriptElement | null;
        if (existing) {
            if (existing.getAttribute("data-loaded") === "1") {
                resolve();
                return;
            }
            existing.addEventListener("load", () => resolve(), {once: true});
            existing.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)), {once: true});
            return;
        }

        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            script.setAttribute("data-loaded", "1");
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
};

const loadStylesheet = (id: string, href: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existing = document.getElementById(id) as HTMLLinkElement | null;
        if (existing) {
            if (existing.getAttribute("data-loaded") === "1") {
                resolve();
                return;
            }
            existing.addEventListener("load", () => resolve(), {once: true});
            existing.addEventListener("error", () => reject(new Error(`Failed to load stylesheet: ${href}`)), {once: true});
            return;
        }

        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => {
            link.setAttribute("data-loaded", "1");
            resolve();
        };
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`));
        document.head.appendChild(link);
    });
};

const loadGoogleMaps = async (config: GoogleMapProviderConfig): Promise<any> => {
    const win = window as WindowWithMaps;
    if (win.google?.maps) return win.google;

    if (!config.apiKey || config.apiKey.trim() === "") {
        throw new Error("Google Maps provider requires providerConfig.google.apiKey");
    }

    if (!googleLoaderPromise) {
        const params = new URLSearchParams({
            key: config.apiKey,
        });
        if (config.language) params.set("language", config.language);
        if (config.region) params.set("region", config.region);

        googleLoaderPromise = loadScript(
            GOOGLE_SCRIPT_ID,
            `https://maps.googleapis.com/maps/api/js?${params.toString()}`,
        ).then(() => {
            const loaded = (window as WindowWithMaps).google;
            if (!loaded?.maps) {
                throw new Error("Google Maps API loaded but window.google.maps is unavailable");
            }
            return loaded;
        });
    }

    return googleLoaderPromise;
};

const loadLeaflet = async (): Promise<any> => {
    const win = window as WindowWithMaps;
    if (win.L) return win.L;

    if (!leafletLoaderPromise) {
        leafletLoaderPromise = Promise.all([
            loadStylesheet(LEAFLET_CSS_ID, "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"),
            loadScript(LEAFLET_SCRIPT_ID, "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"),
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

const createGoogleAdapter = async ({
    container,
    initialLocation,
    disabled,
    config,
    markerDraggable,
    markerIconUrl,
    markerIconSizePx,
    onLocationChange,
}: {
    container: HTMLDivElement;
    initialLocation: MapLocationValue;
    disabled: boolean;
    config?: GoogleMapProviderConfig;
    markerDraggable: boolean;
    markerIconUrl?: string;
    markerIconSizePx: number;
    onLocationChange: (location: MapLocationValue) => void;
}): Promise<MapAdapter> => {
    if (!config) {
        throw new Error("Missing providerConfig.google");
    }

    const google = await loadGoogleMaps(config);

    const map = new google.maps.Map(container, {
        center: {lat: initialLocation.lat, lng: initialLocation.lng},
        zoom: initialLocation.zoom,
        mapId: config.mapId,
        draggable: !disabled,
        gestureHandling: "greedy",
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: true,
        draggableCursor: disabled ? "default" : "grab",
    });

    const markerSize = Math.max(20, markerIconSizePx);
    const marker = new google.maps.Marker({
        map,
        draggable: markerDraggable && !disabled,
        clickable: markerDraggable,
        position: {lat: initialLocation.lat, lng: initialLocation.lng},
        icon: {
            url: markerIconUrl ?? DEFAULT_MARKER_ICON_URL,
            scaledSize: new google.maps.Size(markerSize, markerSize),
            anchor: new google.maps.Point(Math.round(markerSize / 2), markerSize),
        },
    });
    let isDisabled = disabled;

    const emit = (lat: number, lng: number) => {
        const next: MapLocationValue = {
            lat,
            lng,
            zoom: map.getZoom() ?? initialLocation.zoom,
        };
        onLocationChange(next);
    };

    const clickListener = map.addListener("click", (event: any) => {
        if (isDisabled) return;
        const lat = event?.latLng?.lat?.();
        const lng = event?.latLng?.lng?.();
        if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;

        marker.setPosition({lat, lng});
        emit(lat, lng);
    });

    const dragListener = markerDraggable
        ? marker.addListener("dragend", (event: any) => {
            if (isDisabled) return;
            const lat = event?.latLng?.lat?.();
            const lng = event?.latLng?.lng?.();
            if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return;
            emit(lat, lng);
        })
        : null;

    return {
        setLocation: (next: MapLocationValue) => {
            marker.setPosition({lat: next.lat, lng: next.lng});
            map.setCenter({lat: next.lat, lng: next.lng});
            if (isFiniteNumber(next.zoom)) {
                map.setZoom(next.zoom);
            }
        },
        setDisabled: (nextDisabled: boolean) => {
            isDisabled = nextDisabled;
            marker.setDraggable(markerDraggable && !nextDisabled);
            map.setOptions({
                draggable: !nextDisabled,
                draggableCursor: nextDisabled ? "default" : "grab",
            });
        },
        refreshLayout: () => {
            const center = marker.getPosition();
            google.maps.event.trigger(map, "resize");
            if (center) {
                map.setCenter(center);
            }
        },
        destroy: () => {
            if (clickListener) google.maps.event.removeListener(clickListener);
            if (dragListener) google.maps.event.removeListener(dragListener);
            marker.setMap(null);
        },
    };
};

const createOpenStreetMapAdapter = async ({
    container,
    initialLocation,
    disabled,
    config,
    markerDraggable,
    markerIconUrl,
    markerIconSizePx,
    onLocationChange,
}: {
    container: HTMLDivElement;
    initialLocation: MapLocationValue;
    disabled: boolean;
    config?: OpenStreetMapProviderConfig;
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
        interactive: markerDraggable,
        icon: markerIcon,
    }).addTo(map);
    let isDisabled = disabled;

    const setInteractionsDisabled = (nextDisabled: boolean) => {
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
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            if (markerDraggable) {
                marker.dragging?.enable();
            } else {
                marker.dragging?.disable();
            }
        }
    };

    setInteractionsDisabled(disabled);

    const emit = (lat: number, lng: number) => {
        onLocationChange({
            lat,
            lng,
            zoom: map.getZoom(),
        });
    };

    map.on("click", (event: any) => {
        if (isDisabled) return;
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

    // Leaflet needs this after mounting in flex/hidden layouts.
    setTimeout(() => {
        map.invalidateSize();
    }, 0);
    setTimeout(() => {
        map.invalidateSize();
    }, 200);

    return {
        setLocation: (next: MapLocationValue) => {
            marker.setLatLng([next.lat, next.lng]);
            map.setView([next.lat, next.lng], isFiniteNumber(next.zoom) ? next.zoom : map.getZoom());
        },
        setDisabled: (nextDisabled: boolean) => {
            setInteractionsDisabled(nextDisabled);
        },
        refreshLayout: () => {
            map.invalidateSize();
        },
        destroy: () => {
            map.off();
            marker.remove();
            map.remove();
        },
    };
};

export default function MapLocationPicker<TFormValues extends FieldValues = FieldValues>({
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
    const [loading, setLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const isControlled = value !== undefined;
    const currentLocation = useMemo(
        () => normalizeLocation(isControlled ? value : internalLocation, defaultZoom),
        [defaultZoom, internalLocation, isControlled, value],
    );

    const emitLocation = (next: MapLocationValue) => {
        if (!isControlled) {
            setInternalLocation(next);
        }
        onChange?.(next);
    };

    useEffect(() => {
        const adapter = adapterRef.current;
        if (!adapter) return;
        adapter.setLocation(currentLocation);
    }, [currentLocation.lat, currentLocation.lng, currentLocation.zoom]);

    useEffect(() => {
        const adapter = adapterRef.current;
        if (!adapter) return;
        adapter.setDisabled(disabled);
    }, [disabled]);

    useEffect(() => {
        if (!mapRef.current || !adapterRef.current?.refreshLayout) return;

        const observer = new ResizeObserver(() => {
            adapterRef.current?.refreshLayout?.();
        });

        observer.observe(mapRef.current);
        const timeoutId = window.setTimeout(() => {
            adapterRef.current?.refreshLayout?.();
        }, 250);

        return () => {
            observer.disconnect();
            window.clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;
        const runId = ++initRunRef.current;

        const initMap = async () => {
            if (!mapRef.current) return;

            setLoading(true);
            setLoadError(null);

            if (adapterRef.current) {
                adapterRef.current.destroy();
                adapterRef.current = null;
            }

            try {
                const adapter = provider === "google"
                    ? await createGoogleAdapter({
                        container: mapRef.current,
                        initialLocation: currentLocation,
                        disabled,
                        config: providerConfig?.google,
                        markerDraggable,
                        markerIconUrl,
                        markerIconSizePx,
                        onLocationChange: emitLocation,
                    })
                    : await createOpenStreetMapAdapter({
                        container: mapRef.current,
                        initialLocation: currentLocation,
                        disabled,
                        config: providerConfig?.openstreetmap,
                        markerDraggable,
                        markerIconUrl,
                        markerIconSizePx,
                        onLocationChange: emitLocation,
                    });

                if (isCancelled || runId !== initRunRef.current) {
                    adapter.destroy();
                    return;
                }

                adapterRef.current = adapter;
                setLoading(false);
            } catch (err) {
                if (isCancelled) return;

                const message = err instanceof Error ? err.message : "Failed to initialize map provider";
                setLoadError(message);
                setLoading(false);
            }
        };

        void initMap();

        return () => {
            isCancelled = true;
            if (adapterRef.current) {
                adapterRef.current.destroy();
                adapterRef.current = null;
            }
        };
    }, [
        provider,
        providerConfig?.google?.apiKey,
        providerConfig?.google?.language,
        providerConfig?.google?.region,
        providerConfig?.google?.mapId,
        providerConfig?.openstreetmap?.tileUrl,
        providerConfig?.openstreetmap?.tileAttribution,
        providerConfig?.openstreetmap?.maxZoom,
        markerDraggable,
        markerIconUrl,
        markerIconSizePx,
    ]);

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
                    style={{height: `${heightPx}px`, cursor: disabled ? "default" : "grab"}}
                    className="w-full overflow-hidden rounded-md"
                />
            </div>

            {loading && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                    Loading map...
                </p>
            )}

            {loadError && (
                <p className="mt-2 text-xs text-red-600">
                    {loadError}
                </p>
            )}

            {showCoordinates && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Lat: {currentLocation.lat.toFixed(6)} | Lng: {currentLocation.lng.toFixed(6)}
                </p>
            )}

            <FormError error={error}/>
        </div>
    );
}
