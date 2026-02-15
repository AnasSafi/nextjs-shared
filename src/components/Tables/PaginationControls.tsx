import React, {type JSX} from "react";

type PaginationMode = "pages" | "nextPrev";

export type PaginationControlsProps = {
    themeColor: string;

    current: number;

    // In "pages" mode this is used (old behavior)
    total?: number;

    onChange: (page: number) => void;
    maxPages?: number;
    disabled?: boolean;

    // New: when total is unknown
    mode?: PaginationMode;
    hasNext?: boolean;

    // Optional labels override
    labels?: {
        previous?: string;
        next?: string;
    };
};

export function PaginationControls(
    {
        themeColor,
        current,
        total,
        onChange,
        maxPages = 5,
        disabled = false,
        mode = "pages",
        hasNext = false,
        labels,
    }: PaginationControlsProps): JSX.Element {
    /* -----------------------------
     * Mode 1: Numeric pages (old behavior)
     * ----------------------------- */
    if (mode === "pages") {
        if (!total || total <= 1) return <></>;

        const half: number = Math.floor(maxPages / 2);
        let start: number = Math.max(current - half, 1);
        let end: number = Math.min(start + maxPages - 1, total);

        if (end - start + 1 < maxPages) {
            start = Math.max(end - maxPages + 1, 1);
            end = Math.min(start + maxPages - 1, total);
        }

        const pageRange: number[] = Array.from(
            {length: end - start + 1},
            (_, i) => start + i,
        );

        const renderPage = (page: number) => (
            <li key={page}>
                <button
                    onClick={() => !disabled && onChange(page)}
                    disabled={disabled}
                    className={`px-4 py-2 text-sm font-medium rounded-sm
            ${
                        page === current
                            ? `bg-${themeColor}-600 text-white dark:bg-${themeColor}-700`
                            : "text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    aria-current={page === current ? "page" : undefined}
                >
                    {page}
                </button>
            </li>
        );

        return (
            <nav className="flex justify-center mt-6" aria-label="Pagination">
                <ul className="inline-flex items-center gap-1 px-2 py-1 rounded-md border dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm">
                    {start > 1 && (
                        <>
                            {renderPage(1)}
                            {start > 2 && (
                                <li>
                                    <span className="px-3 py-2 text-sm font-medium">…</span>
                                </li>
                            )}
                        </>
                    )}

                    {pageRange.map(renderPage)}

                    {end < total && (
                        <>
                            {end < total - 1 && (
                                <li>
                                    <span className="px-3 py-2 text-sm font-medium">…</span>
                                </li>
                            )}
                            {renderPage(total)}
                        </>
                    )}
                </ul>
            </nav>
        );
    }

    /* -----------------------------
     * Mode 2: Previous / Next only (unknown total)
     * ----------------------------- */
    const hasPrev: boolean = current > 1;
    const showControls: boolean = hasPrev || hasNext;
    if (!showControls) return <></>;

    const prevLabel: string = labels?.previous ?? "السابق";
    const nextLabel: string = labels?.next ?? "التالي";

    const baseBtn = "px-4 py-2 text-sm font-medium rounded-sm transition-colors";
    const enabledBtn = `bg-${themeColor}-600 text-white dark:bg-${themeColor}-700 hover:opacity-90`;
    const disabledBtn =
        "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed";

    return (
        <nav className="flex justify-center mt-6" aria-label="Pagination">
            <ul className="inline-flex items-center gap-2 px-2 py-1 rounded-md border dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm">
                <li>
                    <button
                        type="button"
                        onClick={() => {
                            if (disabled) return;
                            if (!hasPrev) return;
                            onChange(current - 1);
                        }}
                        disabled={disabled || !hasPrev}
                        className={`${baseBtn} ${
                            !disabled && hasPrev ? enabledBtn : disabledBtn
                        }`}
                    >
                        {prevLabel}
                    </button>
                </li>

                <li>
                    <button
                        type="button"
                        onClick={() => {
                            if (disabled) return;
                            if (!hasNext) return;
                            onChange(current + 1);
                        }}
                        disabled={disabled || !hasNext}
                        className={`${baseBtn} ${
                            !disabled && hasNext ? enabledBtn : disabledBtn
                        }`}
                    >
                        {nextLabel}
                    </button>
                </li>
            </ul>
        </nav>
    );
}
