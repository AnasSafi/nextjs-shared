"use client";

import React, {useState, useRef, useEffect, useCallback} from "react";
import clsx from "clsx";
import {ChevronDownIcon, BarsArrowUpIcon, BarsArrowDownIcon} from "@heroicons/react/20/solid";
import type {PaginationRequestModel, SortModel} from "@nextjs-shared/shared";
import {TranslateFn} from "../../models/core/localeModels";

export type TableSortProps = {
    pagination: PaginationRequestModel;
    updateSorts: (newSort: SortModel) => void;
    t: TranslateFn;
};

export default function TableSort({pagination, updateSorts, t}: TableSortProps) {
    const [open, setOpen] = useState(false);

    // Refs
    const rootRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);   // wraps button + panel
    const btnRef: React.RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement>(null); // trigger button
    const panelRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);  // dropdown panel

    const [panelStyle, setPanelStyle] = useState<React.CSSProperties | undefined>(undefined);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener("mousedown", handler);
        return () => window.removeEventListener("mousedown", handler);
    }, [open]);

    // Viewport-aware positioning with flip/shift behavior (LTR/RTL aware).
    const positionPanel = useCallback(() => {
        const btn = btnRef.current;
        const panel = panelRef.current;
        if (!btn) return;

        const rect: DOMRect = btn.getBoundingClientRect();
        const sideOffset = 8;
        const viewportPadding = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const panelWidth =
            panel?.offsetWidth ??
            Math.min(320, Math.max(180, viewportWidth - viewportPadding * 2));
        const panelHeight = panel?.offsetHeight ?? 320;

        const dir = (document.documentElement.dir || getComputedStyle(btn).direction || "ltr")
            .toLowerCase()
            .trim();
        const isRtl = dir === "rtl";

        // Align preference:
        // LTR => panel right edge aligned to trigger right edge.
        // RTL => panel left edge aligned to trigger left edge.
        let nextLeft = isRtl ? rect.left : rect.right - panelWidth;

        // shift: keep inside viewport horizontally
        const minLeft = viewportPadding;
        const maxLeft = Math.max(minLeft, viewportWidth - viewportPadding - panelWidth);
        nextLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);

        const spaceBelow = viewportHeight - rect.bottom - sideOffset - viewportPadding;
        const spaceAbove = rect.top - sideOffset - viewportPadding;
        const preferredHeight = Math.min(panelHeight, 320);

        // flip: prefer below unless above has significantly more room.
        const shouldOpenAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;

        let nextTop: number;
        let maxHeight: number;

        if (shouldOpenAbove) {
            maxHeight = Math.max(0, Math.floor(spaceAbove));
            const usedHeight = Math.min(panelHeight, maxHeight);
            nextTop = rect.top - sideOffset - usedHeight;
            if (nextTop < viewportPadding) nextTop = viewportPadding;
        } else {
            maxHeight = Math.max(0, Math.floor(spaceBelow));
            nextTop = rect.bottom + sideOffset;
            const maxTop = Math.max(viewportPadding, viewportHeight - viewportPadding - 80);
            if (nextTop > maxTop) nextTop = maxTop;
        }

        setPanelStyle({
            position: "fixed",
            left: Math.round(nextLeft),
            top: Math.round(nextTop),
            maxHeight: Math.round(maxHeight),
            maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
            zIndex: 30,
            visibility: maxHeight > 0 ? "visible" : "hidden",
        });
    }, []);

    useEffect(() => {
        if (!open) {
            setPanelStyle(undefined);
            return;
        }

        // Position immediately and on next frame (ensures panelRef has a measured size).
        positionPanel();
        const raf: number = requestAnimationFrame(positionPanel);

        const onResize = () => positionPanel();
        const onScroll = () => positionPanel();

        window.addEventListener("resize", onResize);
        // capture=true so scrolling of any ancestor can trigger repositioning.
        window.addEventListener("scroll", onScroll, {passive: true, capture: true});

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(positionPanel);
            if (btnRef.current) resizeObserver.observe(btnRef.current);
            if (panelRef.current) resizeObserver.observe(panelRef.current);
        }

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, {capture: true});
            resizeObserver?.disconnect();
        };
    }, [open, positionPanel]);

    if (!pagination?.sortableFields?.length) return null;

    const radioLabel: string =
        "inline-flex items-center justify-between w-full p-1 text-gray-500 bg-white " +
        "border border-gray-200 rounded-lg cursor-pointer hover:text-gray-600 hover:bg-gray-100 " +
        "peer-checked:border-amber-600 peer-checked:text-amber-600 " +
        "dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 " +
        "dark:border-gray-700 dark:peer-checked:text-amber-500";

    return (
        <div className="relative inline-block text-left" ref={rootRef}>
            <button
                ref={btnRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex w-full items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold
                   text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50
                   dark:bg-gray-800 dark:text-white dark:ring-gray-50 dark:hover:bg-gray-700"
            >
                {t("sortBy")}
                <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-100"/>
            </button>

            {open && (
                <>
                    {/* Mobile overlay to close when tapping outside */}
                    <button
                        aria-hidden
                        tabIndex={-1}
                        className="fixed inset-0 z-20 cursor-default sm:hidden"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        ref={panelRef}
                        className={clsx(
                            "z-30 origin-top divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5",
                            "fixed overflow-auto overscroll-contain dark:bg-gray-950 dark:ring-white",
                            "w-[min(92vw,20rem)]",
                        )}
                        style={panelStyle ?? {visibility: "hidden"}}
                    >
                        {pagination.sortableFields.map((sort) => {
                            const current = pagination.sorts?.find((s) => s.field === sort.fieldKey);
                            return (
                                <div
                                    key={sort.fieldKey}
                                    className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                >
                                    <span className="grow text-start">{sort.fieldName}</span>

                                    <ul className="flex flex-none gap-x-2">
                                        {/* ASC */}
                                        <li>
                                            <input
                                                id={`asc-${sort.fieldKey}`}
                                                type="checkbox"
                                                className="hidden peer"
                                                checked={current?.operation === "asc"}
                                                onChange={() => {
                                                    updateSorts({
                                                        field: sort.fieldKey,
                                                        operation: "asc",
                                                        doClear: current?.operation === "asc",
                                                    });
                                                }}
                                            />
                                            <label htmlFor={`asc-${sort.fieldKey}`} className={radioLabel}>
                                                <BarsArrowUpIcon className="h-5 w-5"/>
                                            </label>
                                        </li>

                                        {/* DESC */}
                                        <li>
                                            <input
                                                id={`desc-${sort.fieldKey}`}
                                                type="checkbox"
                                                className="hidden peer"
                                                checked={current?.operation === "desc"}
                                                onChange={() => {
                                                    updateSorts({
                                                        field: sort.fieldKey,
                                                        operation: "desc",
                                                        doClear: current?.operation === "desc",
                                                    });
                                                }}
                                            />
                                            <label htmlFor={`desc-${sort.fieldKey}`} className={radioLabel}>
                                                <BarsArrowDownIcon className="h-5 w-5"/>
                                            </label>
                                        </li>
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
