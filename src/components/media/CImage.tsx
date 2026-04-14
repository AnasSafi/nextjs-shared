"use client";
import React, {useMemo, useState, CSSProperties} from "react";
import type {MediaFileViewModel} from "../../models/core/mediaModels";
import ImageShimmerOverlay from "./ImageShimmerOverlay";

type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";

type CImageProps = {
    media?: MediaFileViewModel | null;
    fallbackSrc?: string;
    fallbackSrcs?: string[];
    width?: number;
    height?: number;
    isRounded?: boolean;
    className?: string;
    fillContainer?: boolean;
    album?: MediaFileViewModel[];
    allowModal?: boolean;
    wrapperClassName?: string;
    priority?: boolean;
    sizes?: string;
    /** Controls CSS object-fit on the <img>. Defaults to "cover". */
    objectFit?: ObjectFit;
    /** Adds a subtle border around the image wrapper when true. */
    bordered?: boolean;
};

export const DEFAULT_IMAGE_FALLBACK_SVG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' rx='12' fill='%23F3F4F6'/><circle cx='60' cy='44' r='18' fill='%23D1D5DB'/><path d='M20 98c8-18 23-28 40-28s32 10 40 28' fill='%23D1D5DB'/></svg>";

export default function CImage(
    {
        media,
        fallbackSrc = DEFAULT_IMAGE_FALLBACK_SVG,
        fallbackSrcs,
        width,
        height,
        isRounded = false,
        className,
        fillContainer = false,
        allowModal = true,
        wrapperClassName = "",
        priority = false,
        sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
        objectFit = "cover",
        bordered = false,
    }: CImageProps): React.JSX.Element {
    // Build source chain (primary media url -> fallbacks)
    const chain = useMemo(() => {
        const list: (string | null | undefined)[] = [
            media?.url,
            media?.originalUrl,
            ...(fallbackSrcs ?? []),
            fallbackSrc,
            DEFAULT_IMAGE_FALLBACK_SVG,
        ];
        return Array.from(new Set(list.filter(Boolean) as string[]));
    }, [media?.url, media?.originalUrl, fallbackSrc, fallbackSrcs]);

    // Important: key by media url to reset internal state without setState-in-effect
    const mediaKey = `${media?.url ?? ""}|${media?.originalUrl ?? ""}|${fallbackSrc}|${(fallbackSrcs ?? []).join("|")}`;

    const [idx, setIdx] = useState(0);
    const currentSrc = chain[idx] ?? fallbackSrc;

    const [loading, setLoading] = useState(true);
    const [natural, setNatural] = useState<{ w: number; h: number }>({w: 0, h: 0});
    const [isModalOpen, setModalOpen] = useState(false);

    const reserveStyle: CSSProperties = {};
    if (!fillContainer) {
        const rw = width ?? (natural.w || 100);
        const rh = height ?? (natural.h || 100);
        reserveStyle.width = `${rw}px`;
        reserveStyle.height = `${rh}px`;
    }

    // Build object-fit class
    const fitClass = useMemo(() => {
        switch (objectFit) {
            case "contain":
                return "object-contain";
            case "fill":
                return "object-fill";
            case "none":
                return "object-none";
            case "scale-down":
                return "object-scale-down";
            default:
                return "object-cover";
        }
    }, [objectFit]);

    const imgClasses = [
        fitClass,
        "w-full h-full transition-all duration-500",
        isRounded ? "rounded-full" : "",
        className ?? "",
        loading ? "blur-sm grayscale opacity-80 scale-[1.02]" : "blur-0 grayscale-0 opacity-100 scale-100",
    ]
        .filter(Boolean)
        .join(" ");

    const wrapperClasses = [
        "relative overflow-hidden",
        isRounded ? "rounded-full" : "",
        allowModal ? "cursor-pointer" : "",
        bordered ? "border rounded-md" : "",
        wrapperClassName,
    ]
        .filter(Boolean)
        .join(" ");

    const fillImgClasses = `${imgClasses} absolute inset-0`;

    const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        setNatural({w: img.naturalWidth || 0, h: img.naturalHeight || 0});
        setLoading(false);
    };

    const onImgError = () => {
        if (idx < chain.length - 1) {
            setIdx((i) => i + 1);
            setLoading(true);
        } else {
            setLoading(false);
        }
    };

    const openModal = () => allowModal && setModalOpen(true);
    const closeModal = () => setModalOpen(false);

    return (
        <>
            {/* Keyed by mediaKey to reset idx/loading/natural automatically when image changes */}
            <div
                key={mediaKey}
                className={wrapperClasses}
                style={fillContainer ? {lineHeight: 0} : reserveStyle}
                onClick={openModal}
            >
                {loading && <ImageShimmerOverlay/>}

                {fillContainer ? (
                    <img
                        key={currentSrc}
                        alt={media?.alt ?? ""}
                        src={currentSrc}
                        onLoad={onImgLoad}
                        onError={onImgError}
                        className={fillImgClasses}
                        loading={priority ? "eager" : "lazy"}
                        sizes={sizes}
                    />
                ) : width && height ? (
                    <img
                        key={currentSrc}
                        alt={media?.alt ?? ""}
                        src={currentSrc}
                        width={width}
                        height={height}
                        onLoad={onImgLoad}
                        onError={onImgError}
                        className={imgClasses}
                        loading={priority ? "eager" : "lazy"}
                    />
                ) : natural.w > 0 && natural.h > 0 ? (
                    <img
                        key={currentSrc}
                        alt={media?.alt ?? ""}
                        src={currentSrc}
                        width={natural.w}
                        height={natural.h}
                        onLoad={onImgLoad}
                        onError={onImgError}
                        className={imgClasses}
                        loading={priority ? "eager" : "lazy"}
                    />
                ) : (
                    <img
                        key={currentSrc}
                        alt={media?.alt ?? ""}
                        src={currentSrc}
                        onLoad={onImgLoad}
                        onError={onImgError}
                        className={fillImgClasses}
                        loading={priority ? "eager" : "lazy"}
                        sizes={sizes}
                    />
                )}
            </div>

            {/* Bounded modal: image never exceeds viewport */}
            {allowModal && isModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeModal}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="relative flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={closeModal}
                            className="absolute -top-10 right-0 text-white/80 hover:text-white"
                            aria-label="Close"
                        >
                            ✕
                        </button>

                        {/* Constrain box to viewport; image uses object-contain and intrinsic ratio */}
                        <div
                            className={[
                                "relative",
                                "max-w-[92vw] max-h-[92vh]",
                                isRounded ? "rounded-2xl overflow-hidden" : "",
                            ].join(" ")}
                        >
                            <img
                                alt={media?.alt ?? ""}
                                src={currentSrc}
                                width={natural.w || 1200}
                                height={natural.h || 800}
                                onError={onImgError}
                                className="w-auto h-auto max-w-[92vw] max-h-[92vh] object-contain"
                                loading="eager"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
