"use client";

import {
    type ChangeEvent,
    type FocusEvent,
    type JSX,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type {FieldValues} from "react-hook-form";
import type {RHFErrorCompat} from "../../models/core/formModels";
import {FormError} from "./Helpers/FormError";

export type MapLocationValue = {
    lat: number;
    lng: number;
    zoom?: number;
};

export type MapSearchResult = {
    id: string;
    label: string;
    lat: number;
    lng: number;
};

export type MapLocationSearchHandler = (params: {
    query: string;
    signal?: AbortSignal;
}) => Promise<MapSearchResult[]>;

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
    searchUrl?: string;
    searchResultLimit?: number;
    searchLanguage?: string;
    searchCountryCodes?: string[];
};

export type MapLocationPickerProviderConfig = {
    google?: GoogleMapProviderConfig;
    openstreetmap?: OpenStreetMapProviderConfig;
};

export interface MapLocationPickerProps<TFormValues extends FieldValues = FieldValues> {
    name?: string;
    provider: MapProvider;
    providerConfig?: MapLocationPickerProviderConfig;
    value?: MapLocationValue | null;
    defaultValue?: MapLocationValue;
    onChange?: ((location: MapLocationValue) => void) | ((event: ChangeEvent<HTMLInputElement>) => void);
    onLocationChange?: (location: MapLocationValue) => void;
    label?: string;
    className?: string;
    disabled?: boolean;
    heightPx?: number;
    defaultZoom?: number;
    enableScrollWheelZoom?: boolean;
    autoLocateOnInit?: boolean;
    showMyLocationButton?: boolean;
    myLocationButtonText?: string;
    myLocationZoom?: number;
    geolocationOptions?: PositionOptions;
    markerDraggable?: boolean;
    markerIconUrl?: string;
    markerIconSizePx?: number;
    error?: RHFErrorCompat<TFormValues>;
    showCoordinates?: boolean;
    showSearchInput?: boolean;
    searchPlaceholder?: string;
    searchButtonText?: string;
    searchMinLength?: number;
    searchZoom?: number;
    searchLocations?: MapLocationSearchHandler;
}

type MapAdapter = {
    setLocation: (next: MapLocationValue) => void;
    setDisabled: (disabled: boolean) => void;
    setInteractionEnabled?: (enabled: boolean) => void;
    flyToLocation?: (next: MapLocationValue) => void;
    refreshLayout?: () => void;
    destroy: () => void;
};

type NominatimSearchResponseItem = {
    place_id?: number | string;
    display_name?: string;
    lat?: string;
    lon?: string;
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

const DEFAULT_OSM_SEARCH_URL =
    "https://nominatim.openstreetmap.org/search";

const DEFAULT_OSM_SEARCH_RESULT_LIMIT = 5;

const DEFAULT_MARKER_ICON_URL =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2234%22%20height%3D%2234%22%20viewBox%3D%220%200%2034%2034%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M17%201.8C9.18%201.8%202.8%208.18%202.8%2016c0%2010.41%2012.41%2016.41%2013.05%2016.71a2.5%202.5%200%200%200%202.3%200C18.79%2032.41%2031.2%2026.41%2031.2%2016%2031.2%208.18%2024.82%201.8%2017%201.8Z%22%20fill%3D%22%232563EB%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%226.2%22%20fill%3D%22white%22/%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2216%22%20r%3D%223.2%22%20fill%3D%22%232563EB%22/%3E%3C/svg%3E";

const LEAFLET_SCRIPT_ID = "shared-map-picker-leaflet-script";
const LEAFLET_CSS_ID = "shared-map-picker-leaflet-css";
const MAP_DEBUG = false;
const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
};

let leafletLoaderPromise: Promise<any> | null = null;

const debugMap = (...args: unknown[]): void => {
    if (!MAP_DEBUG) return;
    console.log("[MapLocationPicker]", ...args);
};

const CurrentLocationIcon = ({className}: {className?: string}): JSX.Element => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="3.5"/>
            <path d="M12 2.75v3.5"/>
            <path d="M12 17.75v3.5"/>
            <path d="M2.75 12h3.5"/>
            <path d="M17.75 12h3.5"/>
        </svg>
    );
};

const SearchIcon = ({className}: {className?: string}): JSX.Element => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="6.5"/>
            <path d="m16 16 5 5"/>
        </svg>
    );
};

const getElementSummary = (element: EventTarget | null): string => {
    if (!(element instanceof HTMLElement)) return "unknown";
    const className = typeof element.className === "string" ? element.className : "";
    return `${element.tagName.toLowerCase()}${className ? `.${className.replace(/\s+/g, ".")}` : ""}`;
};

const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    if (error.code === error.PERMISSION_DENIED) {
        return "Location permission denied.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
        return "Location is unavailable.";
    }
    if (error.code === error.TIMEOUT) {
        return "Location request timed out.";
    }
    return "Unable to get current location.";
};

const requestCurrentPosition = (options?: PositionOptions): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by this browser."));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options ?? DEFAULT_GEOLOCATION_OPTIONS);
    });

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

const hasLocationValue = (location: MapLocationValue | null | undefined): boolean =>
    !!location && isFiniteNumber(location.lat) && isFiniteNumber(location.lng);

const clampSearchResultLimit = (value: number | undefined): number => {
    if (!isFiniteNumber(value)) return DEFAULT_OSM_SEARCH_RESULT_LIMIT;
    return Math.min(Math.max(Math.round(value), 1), 10);
};

const getPreferredSearchLanguage = (): string => {
    if (typeof navigator !== "undefined") {
        if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
            return navigator.languages.join(",");
        }

        if (typeof navigator.language === "string" && navigator.language.trim().length > 0) {
            return navigator.language;
        }
    }

    if (typeof document !== "undefined") {
        const documentLanguage = document.documentElement.lang?.trim();

        if (documentLanguage) {
            return documentLanguage;
        }
    }

    return "en";
};

const searchOpenStreetMapLocations = async (
    {
        query,
        config,
        signal,
    }: {
        query: string;
        config?: OpenStreetMapProviderConfig;
        signal?: AbortSignal;
    },
): Promise<MapSearchResult[]> => {
    const searchParams = new URLSearchParams();

    searchParams.set("q", query);
    searchParams.set("format", "jsonv2");
    searchParams.set("limit", String(clampSearchResultLimit(config?.searchResultLimit)));
    searchParams.set("addressdetails", "1");
    searchParams.set("accept-language", config?.searchLanguage ?? getPreferredSearchLanguage());

    if (config?.searchCountryCodes && config.searchCountryCodes.length > 0) {
        searchParams.set("countrycodes", config.searchCountryCodes.join(","));
    }

    const response = await fetch(
        `${config?.searchUrl ?? DEFAULT_OSM_SEARCH_URL}?${searchParams.toString()}`,
        {
            method: "GET",
            signal,
            headers: {
                Accept: "application/json",
            },
        },
    );

    if (!response.ok) {
        throw new Error(`Map search request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as NominatimSearchResponseItem[];

    return payload
        .map((item) => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);

            if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
                return null;
            }

            return {
                id: String(item.place_id ?? `${item.display_name ?? "result"}-${lat}-${lng}`),
                label: item.display_name?.trim() || `${lat}, ${lng}`,
                lat,
                lng,
            } satisfies MapSearchResult;
        })
        .filter((item): item is MapSearchResult => item !== null);
};

const resetLeafletContainer = (container: HTMLDivElement): void => {
    const stamped = container as HTMLDivElement & {_leaflet_id?: number};

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

const normalizeWheelDeltas = (
    event: WheelEvent,
    referenceSizePx: number,
): {x: number; y: number} => {
    const factor = event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
            ? referenceSizePx
            : 1;

    return {
        x: event.deltaX * factor,
        y: event.deltaY * factor,
    };
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
        scrollWheelZoom: false,
        keyboard: false,
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
    let isInteractionEnabled = false;
    let lastDragEndedAtMs = 0;

    const emit = (lat: number, lng: number) => {
        onLocationChange({
            lat,
            lng,
            zoom: map.getZoom(),
        });
    };

    const syncInteractionState = (): void => {
        if (isDisabled) {
            map.dragging.disable();
            map.touchZoom.disable();
            map.doubleClickZoom.disable();
            map.scrollWheelZoom.disable();
            map.boxZoom.disable();
            map.keyboard.disable();
            marker.dragging?.disable();
            return;
        }

        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.boxZoom.enable();

        if (enableScrollWheelZoom && isInteractionEnabled) {
            map.scrollWheelZoom.enable();
            map.keyboard.enable();
        } else {
            map.scrollWheelZoom.disable();
            map.keyboard.disable();
        }

        if (markerDraggable) {
            marker.dragging?.enable();
        } else {
            marker.dragging?.disable();
        }
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

    let pointerDownPosition: {x: number; y: number} | null = null;
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

    const onWheel = (event: WheelEvent) => {
        if (isDisabled || !isInteractionEnabled) return;

        const referenceSizePx = Math.max(container.clientWidth, container.clientHeight, 1);
        const {x: deltaX, y: deltaY} = normalizeWheelDeltas(event, referenceSizePx);

        // Support horizontal wheel / tilt wheel and Shift + wheel fallback.
        const shouldPanHorizontally =
            (Math.abs(deltaX) > 0.5 && Math.abs(deltaX) >= Math.abs(deltaY))
            || (event.shiftKey && Math.abs(deltaY) > 0.5 && Math.abs(deltaX) < 0.5);

        if (!shouldPanHorizontally) return;

        const horizontalDelta = Math.abs(deltaX) > 0.5 ? deltaX : deltaY;

        map.panBy([horizontalDelta, 0], {
            animate: false,
        });

        event.preventDefault();
        event.stopPropagation();
    };

    container.addEventListener("pointerdown", onPointerDown, true);
    container.addEventListener("wheel", onWheel, {capture: true, passive: false});
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

    syncInteractionState();

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

        flyToLocation: (next: MapLocationValue) => {
            const nextZoom = isFiniteNumber(next.zoom) ? next.zoom : map.getZoom();

            marker.setLatLng([next.lat, next.lng]);
            map.flyTo([next.lat, next.lng], nextZoom, {
                animate: true,
                duration: 0.8,
            });
        },

        setDisabled: (nextDisabled: boolean) => {
            isDisabled = nextDisabled;
            syncInteractionState();
        },

        setInteractionEnabled: (enabled: boolean) => {
            isInteractionEnabled = enabled;
            syncInteractionState();
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
            container.removeEventListener("wheel", onWheel, true);
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
        name,
        provider,
        providerConfig,
        value,
        defaultValue,
        onChange,
        onLocationChange,
        label,
        className,
        disabled = false,
        heightPx = 320,
        defaultZoom = 12,
        enableScrollWheelZoom = true,
        autoLocateOnInit = true,
        showMyLocationButton = true,
        myLocationButtonText = "My location",
        myLocationZoom,
        geolocationOptions,
        markerDraggable = false,
        markerIconUrl,
        markerIconSizePx = 34,
        error,
        showCoordinates = true,
        showSearchInput = true,
        searchPlaceholder = "Search for a city, district, or address",
        searchButtonText = "Search",
        searchMinLength = 2,
        searchZoom = 15,
        searchLocations,
    }: MapLocationPickerProps<TFormValues>): JSX.Element {

    const pickerRootRef = useRef<HTMLDivElement | null>(null);
    const interactionFrameRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<HTMLDivElement | null>(null);
    const adapterRef = useRef<MapAdapter | null>(null);
    const searchAbortRef = useRef<AbortController | null>(null);
    const initRunRef = useRef<number>(0);
    const autoLocateRequestedRef = useRef<boolean>(false);
    const currentLocationRef = useRef<MapLocationValue>(normalizeLocation(defaultValue, defaultZoom));
    const interactionEnabledRef = useRef<boolean>(false);
    const skipNextLocationSyncRef = useRef<boolean>(false);
    const emitLocationRef = useRef<(location: MapLocationValue) => void>(() => undefined);

    const [internalLocation, setInternalLocation] = useState<MapLocationValue>(
        normalizeLocation(defaultValue, defaultZoom),
    );
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isMapInteractionEnabled, setIsMapInteractionEnabled] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<MapSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const currentLocation = useMemo(
        () => normalizeLocation(value ?? internalLocation, defaultZoom),
        [value, internalLocation, defaultZoom],
    );

    const hasInitialProvidedLocation = useMemo(
        () => hasLocationValue(value) || hasLocationValue(defaultValue),
        [value, defaultValue],
    );

    const effectiveSearchMinLength = Math.max(1, Math.round(searchMinLength));
    const effectiveSearchZoom = isFiniteNumber(searchZoom) ? searchZoom : 15;
    const canShowSearchInput = provider === "openstreetmap" && showSearchInput;
    const myLocationButtonLabel = isLocating
        ? `${myLocationButtonText}...`
        : myLocationButtonText;
    const searchButtonLabel = isSearching
        ? `${searchButtonText}...`
        : searchButtonText;

    const emitLocation = useCallback((next: MapLocationValue) => {
        setInternalLocation(next);
        onLocationChange?.(next);

        if (!onChange) return;

        // Form mode: when `name` is provided, emit a synthetic input change event.
        if (name && name.trim().length > 0) {
            const syntheticEvent = {
                target: {
                    name,
                    type: "text",
                    value: next,
                    checked: false,
                },
            } as unknown as ChangeEvent<HTMLInputElement>;

            (onChange as (event: ChangeEvent<HTMLInputElement>) => void)(syntheticEvent);
            return;
        }

        // Backward-compatible mode: no `name` => emit raw location value.
        (onChange as (location: MapLocationValue) => void)(next);
    }, [onLocationChange, onChange, name]);

    useEffect(() => {
        emitLocationRef.current = emitLocation;
    }, [emitLocation]);

    useEffect(() => {
        currentLocationRef.current = currentLocation;
    }, [currentLocation]);

    useEffect(() => {
        interactionEnabledRef.current = isMapInteractionEnabled;
        adapterRef.current?.setInteractionEnabled?.(isMapInteractionEnabled);
    }, [isMapInteractionEnabled]);

    useEffect(() => {
        return () => {
            searchAbortRef.current?.abort();
        };
    }, []);

    const activateMapInteraction = useCallback((target?: HTMLDivElement | null): void => {
        if (disabled) return;

        setIsMapInteractionEnabled(true);
        target?.focus({preventScroll: true});
    }, [disabled]);

    const deactivateMapInteraction = useCallback((): void => {
        setIsMapInteractionEnabled(false);
    }, []);

    const handleMapFrameBlur = useCallback((event: FocusEvent<HTMLDivElement>): void => {
        const nextTarget = event.relatedTarget;

        if (!(nextTarget instanceof Node) || !pickerRootRef.current?.contains(nextTarget)) {
            deactivateMapInteraction();
        }
    }, [deactivateMapInteraction]);

    const moveMapToLocation = useCallback((next: MapLocationValue, {animated}: {animated?: boolean} = {}): void => {
        currentLocationRef.current = next;

        if (adapterRef.current) {
            skipNextLocationSyncRef.current = true;

            if (animated && adapterRef.current.flyToLocation) {
                adapterRef.current.flyToLocation(next);
            } else {
                adapterRef.current.setLocation(next);
            }
        }

        emitLocation(next);
    }, [emitLocation]);

    const goToCurrentLocation = useCallback(async ({silent}: {silent?: boolean} = {}): Promise<void> => {
        if (disabled) return;

        if (!silent) {
            setLocationError(null);
        }

        setIsLocating(true);

        try {
            const position = await requestCurrentPosition(geolocationOptions);

            const next: MapLocationValue = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                zoom: myLocationZoom ?? currentLocationRef.current.zoom ?? defaultZoom,
            };

            moveMapToLocation(next);
            setLocationError(null);
        } catch (error: unknown) {
            if (!silent) {
                const message = typeof (error as {code?: unknown})?.code === "number"
                    ? getGeolocationErrorMessage(error as GeolocationPositionError)
                    : "Unable to get current location.";

                setLocationError(message);
            }

            debugMap("goToCurrentLocation:error", {error});
        } finally {
            setIsLocating(false);
        }
    }, [defaultZoom, disabled, geolocationOptions, moveMapToLocation, myLocationZoom]);

    const moveToSearchResult = useCallback((result: MapSearchResult): void => {
        const next: MapLocationValue = {
            lat: result.lat,
            lng: result.lng,
            zoom: effectiveSearchZoom,
        };

        moveMapToLocation(next, {animated: true});
        setSearchQuery(result.label);
        setSearchResults([]);
        setSearchError(null);
        setLocationError(null);
        activateMapInteraction(interactionFrameRef.current);
    }, [activateMapInteraction, effectiveSearchZoom, moveMapToLocation]);

    const handleSearch = useCallback(async (): Promise<void> => {
        if (disabled || provider !== "openstreetmap") return;

        const query = searchQuery.trim();

        if (query.length < effectiveSearchMinLength) {
            setSearchResults([]);
            setSearchError(`Enter at least ${effectiveSearchMinLength} characters.`);
            return;
        }

        searchAbortRef.current?.abort();

        const abortController = new AbortController();
        searchAbortRef.current = abortController;

        setIsSearching(true);
        setSearchError(null);

        try {
            const results = searchLocations
                ? await searchLocations({
                    query,
                    signal: abortController.signal,
                })
                : await searchOpenStreetMapLocations({
                    query,
                    config: providerConfig?.openstreetmap,
                    signal: abortController.signal,
                });

            if (abortController.signal.aborted) return;

            if (results.length === 0) {
                setSearchResults([]);
                setSearchError("No matching locations were found.");
                return;
            }

            if (results.length === 1) {
                moveToSearchResult(results[0]);
                return;
            }

            setSearchResults(results);
        } catch (error: unknown) {
            if ((error as {name?: string})?.name === "AbortError") {
                return;
            }

            debugMap("handleSearch:error", {error});
            setSearchResults([]);
            setSearchError("Unable to search for a location right now.");
        } finally {
            if (searchAbortRef.current === abortController) {
                searchAbortRef.current = null;
                setIsSearching(false);
            }
        }
    }, [
        disabled,
        effectiveSearchMinLength,
        moveToSearchResult,
        provider,
        providerConfig?.openstreetmap,
        searchLocations,
        searchQuery,
    ]);

    useEffect(() => {
        if (!isMapInteractionEnabled) return;

        const handlePointerDown = (event: PointerEvent): void => {
            const target = event.target;
            const root = pickerRootRef.current;

            if (!(target instanceof Node) || !root) return;

            if (!root.contains(target)) {
                deactivateMapInteraction();
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;

            deactivateMapInteraction();
            interactionFrameRef.current?.blur();
        };

        document.addEventListener("pointerdown", handlePointerDown, true);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMapInteractionEnabled, deactivateMapInteraction]);

    useEffect(() => {
        if (searchResults.length === 0) return;

        const handlePointerDown = (event: PointerEvent): void => {
            const target = event.target;
            const root = pickerRootRef.current;

            if (!(target instanceof Node) || !root) return;

            if (!root.contains(target)) {
                setSearchResults([]);
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                setSearchResults([]);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown, true);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown, true);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [searchResults.length]);

    useEffect(() => {
        if (!mapRef.current || typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(() => {
            adapterRef.current?.refreshLayout?.();
        });

        observer.observe(mapRef.current);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!disabled) return;
        deactivateMapInteraction();
    }, [disabled, deactivateMapInteraction]);

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
                    initialLocation: currentLocationRef.current,
                    disabled,
                    config: providerConfig?.openstreetmap,
                    enableScrollWheelZoom,
                    markerDraggable,
                    markerIconUrl,
                    markerIconSizePx,
                    onLocationChange: (next) => {
                        emitLocationRef.current(next);
                    },
                    canInitialize: () => !isCancelled && runId === initRunRef.current,
                });

                if (isCancelled || runId !== initRunRef.current) {
                    adapter.destroy();
                    return;
                }

                adapterRef.current = adapter;
                adapter.setLocation(currentLocationRef.current);
                adapter.setDisabled(disabled);
                adapter.setInteractionEnabled?.(interactionEnabledRef.current);

                debugMap("initMap:success", {
                    provider,
                    runId,
                });

                if (
                    autoLocateOnInit &&
                    !hasInitialProvidedLocation &&
                    !autoLocateRequestedRef.current
                ) {
                    autoLocateRequestedRef.current = true;
                    void goToCurrentLocation({silent: true});
                }
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
        autoLocateOnInit,
        hasInitialProvidedLocation,
        goToCurrentLocation,
    ]);

    useEffect(() => {
        if (skipNextLocationSyncRef.current) {
            skipNextLocationSyncRef.current = false;
            return;
        }

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

            <div
                ref={pickerRootRef}
                className="rounded-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700"
            >
                {(canShowSearchInput || showMyLocationButton) && (
                    <div className="mb-2 flex items-center gap-2">
                        {canShowSearchInput && (
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);

                                        if (searchResults.length > 0) {
                                            setSearchResults([]);
                                        }

                                        if (searchError) {
                                            setSearchError(null);
                                        }
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            void handleSearch();
                                            return;
                                        }

                                        if (event.key === "Escape" && searchResults.length > 0) {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setSearchResults([]);
                                        }
                                    }}
                                    disabled={disabled || isSearching}
                                    placeholder={searchPlaceholder}
                                    autoComplete="off"
                                    className="h-10 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleSearch();
                                    }}
                                    disabled={disabled || isSearching}
                                    title={searchButtonLabel}
                                    aria-label={searchButtonLabel}
                                    aria-busy={isSearching}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    <SearchIcon className={`h-4 w-4 ${isSearching ? "animate-pulse" : ""}`}/>
                                    <span className="sr-only">{searchButtonLabel}</span>
                                </button>
                            </div>
                        )}

                        {showMyLocationButton && (
                            <button
                                type="button"
                                onClick={() => {
                                    void goToCurrentLocation();
                                }}
                                disabled={disabled || isLocating}
                                title={myLocationButtonLabel}
                                aria-label={myLocationButtonLabel}
                                aria-busy={isLocating}
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                <CurrentLocationIcon className={`h-4 w-4 ${isLocating ? "animate-spin" : ""}`}/>
                                <span className="sr-only">{myLocationButtonLabel}</span>
                            </button>
                        )}
                    </div>
                )}

                {searchError && (
                    <p className="mb-2 text-xs text-red-600">
                        {searchError}
                    </p>
                )}

                {searchResults.length > 0 && (
                    <div className="mb-2 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
                        {searchResults.map((result) => (
                            <button
                                key={result.id}
                                type="button"
                                onClick={() => {
                                    moveToSearchResult(result);
                                }}
                                title={result.label}
                                className="block w-full border-b border-gray-100 px-3 py-2 text-start text-sm text-gray-800 transition hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700/50"
                            >
                                {result.label}
                            </button>
                        ))}
                    </div>
                )}

                <div
                    ref={interactionFrameRef}
                    tabIndex={disabled ? -1 : 0}
                    onPointerDownCapture={(event) => {
                        activateMapInteraction(event.currentTarget);
                    }}
                    onFocus={(event) => {
                        activateMapInteraction(event.currentTarget);
                    }}
                    onBlur={handleMapFrameBlur}
                    className={[
                        "relative overflow-hidden rounded-md border transition focus:outline-none",
                        disabled
                            ? "border-gray-200 dark:border-gray-700"
                            : isMapInteractionEnabled
                                ? "border-blue-500 ring-2 ring-blue-100 dark:border-blue-400 dark:ring-blue-500/20"
                                : "border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500",
                    ].join(" ")}
                    aria-label={label ?? "Map location picker"}
                >
                    <div
                        ref={mapRef}
                        style={{
                            height: `${heightPx}px`,
                            cursor: disabled ? "default" : "grab",
                        }}
                        className="relative z-0 w-full overflow-hidden active:cursor-grabbing"
                    />
                </div>
            </div>

            {locationError && (
                <p className="mt-2 text-xs text-red-600">
                    {locationError}
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