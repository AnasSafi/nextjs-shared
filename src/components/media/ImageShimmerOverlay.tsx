"use client";
import React from "react";

type Props = {
    /** Extra classes applied to the outer wrapper */
    className?: string;
    /** Sweep duration in milliseconds */
    speedMs?: number;
    /** Beam angle in degrees */
    angleDeg?: number;
    /**
     * Tailwind-based styling tips (no inline needed for these):
     * - Base tint:     bg-black/5  and dark:bg-white/5
     * - Beam strength: via-black/20 and dark:via-white/25
     */
};

export default function ImageShimmerOverlay(
    {
        className = "",
        speedMs = 1200,
        angleDeg = 45,
    }: Props) {
    return (
        <div
            className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
            aria-hidden
        >
            {/* Subtle base tint that works in both light and dark themes */}
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5"/>

            {/* Rotator wrapper: angle is dynamic, so we use inline style for transform only */}
            <div
                className="absolute -left-[75%] -top-[75%] w-[250%] h-[250%] will-change-transform"
                style={{transform: `rotate(${angleDeg}deg)`}}
            >
                {/* Sweeping beam; multiply in light, screen in dark for proper contrast */}
                <div
                    className="
            absolute inset-0
            bg-linear-to-r from-transparent via-black/20 to-transparent
            dark:via-white/25
            mix-blend-multiply dark:mix-blend-screen
            animate-img-sweep motion-reduce:animate-none
          "
                    style={{animationDuration: `${speedMs}ms`}}
                />
            </div>
        </div>
    );
}
