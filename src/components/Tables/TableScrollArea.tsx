"use client";

import React, {type JSX, useCallback, useEffect, useRef, useState} from "react";
import clsx from "clsx";
import {getElementDirection} from "./TableFloatingMenu";

export type TableScrollState = {
    hasOverflow: boolean;
    atLogicalStart: boolean;
    atLogicalEnd: boolean;
};

export function getNormalizedScrollLeft(element: HTMLElement, direction: "ltr" | "rtl"): number {
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const rawScrollLeft = element.scrollLeft;

    if (direction !== "rtl") {
        return Math.min(Math.max(rawScrollLeft, 0), maxScroll);
    }

    if (rawScrollLeft < 0) {
        return Math.min(Math.max(-rawScrollLeft, 0), maxScroll);
    }

    return Math.min(Math.max(maxScroll - rawScrollLeft, 0), maxScroll);
}

export function getTableScrollState(element: HTMLElement, direction: "ltr" | "rtl"): TableScrollState {
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const normalizedScrollLeft = getNormalizedScrollLeft(element, direction);
    const tolerance = 1;

    return {
        hasOverflow: maxScroll > tolerance,
        atLogicalStart: normalizedScrollLeft <= tolerance,
        atLogicalEnd: normalizedScrollLeft >= maxScroll - tolerance,
    };
}

export type TableScrollAreaProps = {
    label: string;
    children: React.ReactNode;
    className?: string;
};

export default function TableScrollArea(
    {
        label,
        children,
        className,
    }: TableScrollAreaProps,
): JSX.Element {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
    const [scrollState, setScrollState] = useState<TableScrollState>({
        hasOverflow: false,
        atLogicalStart: true,
        atLogicalEnd: true,
    });

    const updateScrollState = useCallback((): void => {
        const element = scrollRef.current;
        if (!element) return;

        const nextDirection = getElementDirection(element);
        setDirection(nextDirection);
        setScrollState(getTableScrollState(element, nextDirection));
    }, []);

    useEffect(() => {
        updateScrollState();

        const element = scrollRef.current;
        if (!element) return;

        element.addEventListener("scroll", updateScrollState, {passive: true});
        window.addEventListener("resize", updateScrollState);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(updateScrollState);
            resizeObserver.observe(element);
            if (element.firstElementChild instanceof HTMLElement) {
                resizeObserver.observe(element.firstElementChild);
            }
        }

        return () => {
            element.removeEventListener("scroll", updateScrollState);
            window.removeEventListener("resize", updateScrollState);
            resizeObserver?.disconnect();
        };
    }, [updateScrollState]);

    const showStartShadow = scrollState.hasOverflow && !scrollState.atLogicalStart;
    const showEndShadow = scrollState.hasOverflow && !scrollState.atLogicalEnd;

    return (
        <div
            className={clsx(
                "relative isolate z-0 w-full min-w-0 max-w-full",
                className,
            )}
        >
            <div
                ref={scrollRef}
                role="region"
                aria-label={label || "Table"}
                tabIndex={scrollState.hasOverflow ? 0 : undefined}
                data-table-scroll-area="true"
                data-overflow={scrollState.hasOverflow ? "true" : "false"}
                className={clsx(
                    "w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                    "dark:focus-visible:ring-gray-300",
                )}
            >
                {children}
            </div>

            {showStartShadow && (
                <div
                    aria-hidden="true"
                    data-scroll-shadow="start"
                    className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-8"
                    style={{
                        background: direction === "rtl"
                            ? "linear-gradient(to left, rgba(0,0,0,0.14), rgba(0,0,0,0))"
                            : "linear-gradient(to right, rgba(0,0,0,0.14), rgba(0,0,0,0))",
                    }}
                />
            )}

            {showEndShadow && (
                <div
                    aria-hidden="true"
                    data-scroll-shadow="end"
                    className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-8"
                    style={{
                        background: direction === "rtl"
                            ? "linear-gradient(to right, rgba(0,0,0,0.14), rgba(0,0,0,0))"
                            : "linear-gradient(to left, rgba(0,0,0,0.14), rgba(0,0,0,0))",
                    }}
                />
            )}
        </div>
    );
}
