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

    // CSS variables for mobile (fixed) positioning
    const [vars, setVars] = useState<{ left?: number; top?: number }>({});

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

    // Reposition on open/resize/scroll (mobile only uses these vars; desktop uses absolute)
    const positionPanel = useCallback(() => {
        const btn = btnRef.current;
        const panel = panelRef.current;
        if (!btn) return;

        const r: DOMRect = btn.getBoundingClientRect();
        const spacing = 8; // px below the button
        const vw: number = window.innerWidth;

        // First pass: center by button center
        let nextLeft: number = r.left + r.width / 2;
        const nextTop: number = r.bottom + spacing;

        // Optional clamping after we know panel width
        if (panel) {
            const w: number = panel.offsetWidth || 0;
            const half: number = w / 2;
            const margin = 8;
            if (nextLeft - half < margin) nextLeft = margin + half;
            if (nextLeft + half > vw - margin) nextLeft = vw - margin - half;
        }

        setVars({left: nextLeft, top: nextTop});
    }, []);

    useEffect(() => {
        if (!open) return;

        // Position immediately and on next frame (ensures panelRef has size)
        positionPanel();
        const raf: number = requestAnimationFrame(positionPanel);

        const onResize = () => positionPanel();
        const onScroll = () => positionPanel();

        window.addEventListener("resize", onResize);
        // capture=true to react to scrolling of any ancestor
        window.addEventListener("scroll", onScroll, {passive: true, capture: true});

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, {capture: true});
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
                        // Mobile: fixed + CSS variables (left/top), centered via translate-x-1/2
                        // Desktop (sm+): absolute under the button (top-full), aligned by side (LTR/RTL)
                        className={clsx(
                            "z-30 origin-top divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5",
                            "max-h-[70vh] overflow-y-auto dark:bg-gray-950 dark:ring-white",

                            // Base (mobile): fixed using CSS vars
                            "fixed left-(--menu-left,50%) top-(--menu-top,6rem) -translate-x-1/2",

                            // Desktop overrides
                            "sm:absolute sm:translate-x-0 sm:left-auto sm:top-full sm:mt-2",
                            "ltr:sm:right-0 rtl:sm:left-0",
                            // Widths
                            "w-[min(90vw,16rem)] sm:w-56",
                        )}
                        // Provide CSS variables for mobile positioning
                        style={
                            {
                                // numbers → px
                                ["--menu-left"]: vars.left != null ? `${vars.left}px` : undefined,
                                ["--menu-top"]: vars.top != null ? `${vars.top}px` : undefined,
                            } as React.CSSProperties
                        }
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
