"use client";

import React, {JSX, useCallback, useEffect, useId, useMemo, useRef, useState} from "react";
import {createPortal} from "react-dom";
import CImage, {DEFAULT_IMAGE_FALLBACK_SVG} from "../media/CImage";
import type {MediaFileViewModel} from "../../models/core/mediaModels";

type ZoomableImageLabels = {
    open: string;
    close: string;
    zoomIn: string;
    zoomOut: string;
    reset: string;
};

type ZoomableImageProps = {
    mediaFile: MediaFileViewModel;
    isRounded?: boolean;
    width?: number;
    height?: number;
    className?: string;
    thumbnailFillContainer?: boolean;
    thumbnailWrapperClassName?: string;
    thumbnailImageClassName?: string;
    fallbackSrc?: string;
    fallbackSrcs?: string[];
    labels?: Partial<ZoomableImageLabels>; // Optional i18n (not visible)
};

type Vec2 = { x: number; y: number };

const TRANSITION_MS = 180;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

function cn(...classes: Array<string | null | undefined | false>) {
    return classes.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

/** Simple icon wrapper (keeps consistent size & stroke) */
function Icon(
    {
        children,
        className,
    }: {
        children: React.ReactNode;
        className?: string;
    }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={cn("h-5 w-5", className)}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {children}
        </svg>
    );
}

function IconZoomIn() {
    return (
        <Icon>
            <circle cx="11" cy="11" r="7"/>
            <path d="M20 20l-3.5-3.5"/>
            <path d="M11 8v6"/>
            <path d="M8 11h6"/>
        </Icon>
    );
}

function IconZoomOut() {
    return (
        <Icon>
            <circle cx="11" cy="11" r="7"/>
            <path d="M20 20l-3.5-3.5"/>
            <path d="M8 11h6"/>
        </Icon>
    );
}

function IconReset() {
    return (
        <Icon>
            <path d="M21 12a9 9 0 1 1-3.1-6.8"/>
            <path d="M21 3v6h-6"/>
        </Icon>
    );
}

function IconClose() {
    return (
        <Icon>
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
        </Icon>
    );
}

function IconMagnify() {
    return (
        <Icon>
            <circle cx="11" cy="11" r="7"/>
            <path d="M20 20l-3.5-3.5"/>
        </Icon>
    );
}

export function ZoomableImage(
    {
        mediaFile,
        isRounded = true,
        width = 150,
        height = 150,
        className,
        thumbnailFillContainer = false,
        thumbnailWrapperClassName,
        thumbnailImageClassName,
        fallbackSrc = DEFAULT_IMAGE_FALLBACK_SVG,
        fallbackSrcs,
        labels,
    }: ZoomableImageProps): JSX.Element {
    const a11y: ZoomableImageLabels = {
        open: labels?.open ?? "فتح",
        close: labels?.close ?? "إغلاق",
        zoomIn: labels?.zoomIn ?? "تكبير",
        zoomOut: labels?.zoomOut ?? "تصغير",
        reset: labels?.reset ?? "إعادة ضبط",
    };

    const dialogId = useId();
    const srcChain = useMemo(() => {
        const list: (string | null | undefined)[] = [
            mediaFile.originalUrl,
            mediaFile.url,
            ...(fallbackSrcs ?? []),
            fallbackSrc,
            DEFAULT_IMAGE_FALLBACK_SVG,
        ];

        return Array.from(new Set(list.filter(Boolean) as string[]));
    }, [mediaFile.originalUrl, mediaFile.url, fallbackSrc, fallbackSrcs]);

    const [srcIndex, setSrcIndex] = useState(0);
    const src = srcChain[srcIndex] ?? fallbackSrc;

    // Modal states (mount + animate)
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [canPortal, setCanPortal] = useState(false);

    // Zoom/pan
    const [scale, setScale] = useState<number>(1);
    const [translate, setTranslate] = useState<Vec2>({x: 0, y: 0});

    // Refs
    const lastActiveElementRef = useRef<HTMLElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);

    // Pointer gesture state (drag + pinch)
    const gestureRef = useRef<{
        pointers: Map<number, { x: number; y: number }>;
        lastDistance: number | null;
    }>({pointers: new Map(), lastDistance: null});

    useEffect(() => {
        setCanPortal(true);
    }, []);

    const resetZoom = useCallback(() => {
        setScale(1);
        setTranslate({x: 0, y: 0});
        gestureRef.current.lastDistance = null;
        gestureRef.current.pointers.clear();
    }, []);

    const openModal = useCallback(() => {
        lastActiveElementRef.current = (document.activeElement as HTMLElement) ?? null;
        setMounted(true);
        requestAnimationFrame(() => setOpen(true));
    }, []);

    const closeModal = useCallback(() => {
        setOpen(false);
        window.setTimeout(() => {
            setMounted(false);
            resetZoom();
            lastActiveElementRef.current?.focus?.();
        }, TRANSITION_MS);
    }, [resetZoom]);

    // Lock body scroll while modal is mounted
    useEffect(() => {
        if (!mounted) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [mounted]);

    // Focus close button when opened
    useEffect(() => {
        if (!mounted) return;
        closeBtnRef.current?.focus();
    }, [mounted]);

    // Close on Escape + basic focus trap
    useEffect(() => {
        if (!mounted) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
                return;
            }

            if (e.key !== "Tab") return;

            const panel = panelRef.current;
            if (!panel) return;

            const focusables = Array.from(
                panel.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));

            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (!active) return;

            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [mounted, closeModal]);

    // Reset zoom whenever new image opened
    useEffect(() => {
        if (!mounted) return;
        resetZoom();
    }, [mounted, src, resetZoom]);

    useEffect(() => {
        setSrcIndex(0);
    }, [mediaFile.id, mediaFile.url, mediaFile.originalUrl, fallbackSrc, fallbackSrcs]);

    const onModalImageError = useCallback(() => {
        setSrcIndex((idx) => (idx < srcChain.length - 1 ? idx + 1 : idx));
    }, [srcChain.length]);

    const zoomIn = useCallback(() => {
        setScale((s) => clamp(s * 1.15, MIN_SCALE, MAX_SCALE));
    }, []);

    const zoomOut = useCallback(() => {
        setScale((s) => {
            const next = clamp(s / 1.15, MIN_SCALE, MAX_SCALE);
            if (next === 1) setTranslate({x: 0, y: 0});
            return next;
        });
    }, []);

    const toggleZoom = useCallback(() => {
        setScale((s) => {
            const next = s <= 1 ? 2 : 1;
            if (next === 1) setTranslate({x: 0, y: 0});
            return next;
        });
    }, []);

    const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();

        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = direction > 0 ? 1.08 : 0.92;

        setScale((s) => {
            const next = clamp(s * factor, MIN_SCALE, MAX_SCALE);
            if (next === 1) setTranslate({x: 0, y: 0});
            return next;
        });
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "touch" && e.button !== 0) return;

        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);

        gestureRef.current.pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});

        if (gestureRef.current.pointers.size === 2) {
            const [p1, p2] = Array.from(gestureRef.current.pointers.values());
            gestureRef.current.lastDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        }
    }, []);

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const g = gestureRef.current;
            const prev = g.pointers.get(e.pointerId);
            if (!prev) return;

            const next = {x: e.clientX, y: e.clientY};
            g.pointers.set(e.pointerId, next);

            // Single pointer => pan (only if zoomed)
            if (g.pointers.size === 1) {
                if (scale <= 1) return;
                const dx = next.x - prev.x;
                const dy = next.y - prev.y;
                setTranslate((t) => ({x: t.x + dx, y: t.y + dy}));
                return;
            }

            // Two pointers => pinch zoom
            if (g.pointers.size === 2) {
                const [p1, p2] = Array.from(g.pointers.values());
                const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

                if (g.lastDistance && g.lastDistance > 0) {
                    const ratio = dist / g.lastDistance;
                    setScale((s) => clamp(s * ratio, MIN_SCALE, MAX_SCALE));
                }

                g.lastDistance = dist;
            }
        },
        [scale],
    );

    const onPointerUpOrCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const g = gestureRef.current;
        g.pointers.delete(e.pointerId);
        if (g.pointers.size < 2) g.lastDistance = null;

        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // No-op
        }
    }, []);

    return (
        <>
            {/* Thumbnail (Icon overlay only) */}
            <button
                type="button"
                onClick={openModal}
                aria-haspopup="dialog"
                aria-expanded={mounted}
                aria-controls={dialogId}
                aria-label={a11y.open}
                className={cn(
                    "group relative inline-flex items-center justify-center",
                    thumbnailFillContainer && "w-full h-full",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
                    className,
                )}
            >
                <span className="absolute inset-0 rounded-md ring-1 ring-black/5 group-hover:ring-black/10"/>
                <CImage
                    width={thumbnailFillContainer ? undefined : width}
                    height={thumbnailFillContainer ? undefined : height}
                    media={mediaFile}
                    allowModal={false}
                    isRounded={isRounded}
                    fillContainer={thumbnailFillContainer}
                    fallbackSrc={fallbackSrc}
                    fallbackSrcs={fallbackSrcs}
                    wrapperClassName={thumbnailFillContainer ? cn("w-full h-full", thumbnailWrapperClassName) : thumbnailWrapperClassName}
                    className={thumbnailImageClassName}
                />

                {/* Hover icon */}
                <span
                    className={cn(
                        "pointer-events-none absolute inset-0 grid place-items-center",
                        "opacity-0 transition-opacity duration-150 motion-reduce:transition-none",
                        "group-hover:opacity-100",
                    )}
                >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/55 text-white shadow">
            <IconMagnify/>
          </span>
        </span>
            </button>

            {/* Modal (Icons only toolbar) */}
            {mounted && canPortal
                ? createPortal(
                    <div
                        id={dialogId}
                        role="dialog"
                        aria-modal="true"
                        aria-label={mediaFile.alt ?? a11y.open}
                        className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
                    >
                        {/* Backdrop */}
                        <div
                            className={cn(
                                "absolute inset-0 bg-black/70 backdrop-blur-sm",
                                "transition-opacity duration-200 motion-reduce:transition-none",
                                open ? "opacity-100" : "opacity-0",
                            )}
                            onClick={closeModal}
                        />

                        {/* Panel */}
                        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                            <div
                                ref={panelRef}
                                className={cn(
                                    "relative z-10 h-[92vh] w-[95vw] max-w-6xl overflow-hidden rounded-2xl",
                                    "bg-neutral-950/70 ring-1 ring-white/10 shadow-2xl",
                                    "transition-all duration-200 motion-reduce:transition-none",
                                    open ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
                                )}
                            >
                                {/* Floating toolbar (icons only) */}
                                <div
                                    className={cn(
                                        "absolute right-3 top-3 z-20 flex items-center gap-1 rounded-xl",
                                        "bg-black/45 p-1 backdrop-blur-md ring-1 ring-white/10",
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={zoomOut}
                                        aria-label={a11y.zoomOut}
                                        className={cn(
                                            "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90",
                                            "bg-white/10 hover:bg-white/15 active:bg-white/20",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                        )}
                                    >
                                        <IconZoomOut/>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetZoom}
                                        aria-label={a11y.reset}
                                        className={cn(
                                            "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90",
                                            "bg-white/10 hover:bg-white/15 active:bg-white/20",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                        )}
                                    >
                                        <IconReset/>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={zoomIn}
                                        aria-label={a11y.zoomIn}
                                        className={cn(
                                            "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90",
                                            "bg-white/10 hover:bg-white/15 active:bg-white/20",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                        )}
                                    >
                                        <IconZoomIn/>
                                    </button>

                                    <button
                                        ref={closeBtnRef}
                                        type="button"
                                        onClick={closeModal}
                                        aria-label={a11y.close}
                                        className={cn(
                                            "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90",
                                            "bg-white/10 hover:bg-white/15 active:bg-white/20",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                        )}
                                    >
                                        <IconClose/>
                                    </button>
                                </div>

                                {/* Image stage */}
                                <div className="absolute inset-0">
                                    <div
                                        className={cn(
                                            "absolute inset-0 select-none overflow-hidden",
                                            "touch-none",
                                            scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
                                        )}
                                        onDoubleClick={toggleZoom}
                                        onWheel={onWheel}
                                        onPointerDown={onPointerDown}
                                        onPointerMove={onPointerMove}
                                        onPointerUp={onPointerUpOrCancel}
                                        onPointerCancel={onPointerUpOrCancel}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
                                            <div
                                                className="relative h-full w-full"
                                                style={{
                                                    transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                                                    transformOrigin: "center",
                                                    transition: scale === 1 ? "transform 160ms ease" : undefined,
                                                }}
                                            >
                                                <img
                                                    alt={mediaFile.alt ?? ""}
                                                    src={src}
                                                    draggable={false}
                                                    onError={onModalImageError}
                                                    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                                                    loading="eager"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )
                : null}
        </>
    );
}
