"use client";

import React, {
    type JSX,
    useState,
    useImperativeHandle,
    forwardRef,
    useRef,
    useCallback,
    useEffect,
} from "react";
import clsx from "clsx";
import {rowBackgroundClasses} from "./RowBackgroundClasses";
import type {Column, RowAction, RowMeta} from "../../models/ui/tableModels";
import {TooltipIcon} from "../Form/TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";
import TableRowActions from "./TableRowActions";
import {TableCellContent} from "./getTableCellContent";

export interface CardViewHandle {
    flashCard: (index: number, flashes?: number, interval?: number) => void;
}

export type CardViewProps<T extends RowMeta<string | number, T>> = {
    data: T[];
    columns: Column<T>[];
    timeZone?: string | null;
    clientRowActions?: RowAction<T>[];
    showRowsActions?: boolean;

    currentLng: string;
    t: TranslateFn;
};

function CardViewInner<T extends RowMeta<string | number, T>>(
    {
        data,
        columns,
        timeZone,
        clientRowActions,
        showRowsActions = false,
        currentLng,
        t,
    }: CardViewProps<T>,
    ref: React.Ref<CardViewHandle>,
): JSX.Element {

    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const blinkTimer: React.RefObject<ReturnType<typeof setInterval> | null> = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearBlink: () => void = useCallback(() => {
        if (blinkTimer.current) clearInterval(blinkTimer.current);
        blinkTimer.current = null;
        setHighlightedIndex(null);
    }, []);

    const flashCard: (index: number, flashes?: number, interval?: number) => void = useCallback(
        (index: number, flashes = 3, interval = 300) => {
            clearBlink();
            let count = 0;
            setHighlightedIndex(index);

            blinkTimer.current = setInterval((): void => {
                setHighlightedIndex((prev: number | null): number | null => (prev === null ? index : null));
                count++;
                if (count >= flashes * 2) {
                    clearBlink();
                }
            }, interval);
        },
        [clearBlink],
    );

    useImperativeHandle(ref, () => ({flashCard}), [flashCard]);

    useEffect((): () => void => clearBlink, [clearBlink]);

    return (
        <div className="mt-8 flex w-full min-w-0 max-w-full flex-col gap-y-4 min-[1024px]:hidden">
            {data.map((row: T, rI: number): JSX.Element => (
                <div
                    key={rI}
                    className={`
                    ${rowBackgroundClasses(row.variant)}
                    min-w-0 rounded-xl p-4 shadow
                    ring-1 ring-inset ring-gray-200/70 dark:ring-white/10
                    transition-colors
                    ${highlightedIndex === rI ? "bg-green-300/40 dark:bg-green-700/20" : ""}
                  `}
                >
                    <div className="space-y-3">
                        {columns.map((col: Column<T>, cI: number): JSX.Element => (
                            <div key={cI} className="min-w-0">
                                <div className="min-w-0 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                    <div className="flex min-w-0 items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                        {col.title}
                                        {col.tooltip && <TooltipIcon tipText={col.tooltip} />}
                                    </div>
                                    <div
                                        className={clsx(
                                            "min-w-0 text-xs font-semibold text-gray-900 break-words [overflow-wrap:anywhere] dark:text-white sm:text-sm",
                                            col.cell?.className,
                                            col.cellClassName,
                                        )}
                                    >
                                        {TableCellContent({
                                            col,
                                            row,
                                            currentLng,
                                            tableTimeZone: timeZone,
                                            t,
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {showRowsActions && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            <TableRowActions
                                row={row}
                                clientRowActions={clientRowActions}
                                t={t}
                                displayMode="card"
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export const CardView = forwardRef(CardViewInner) as <T extends RowMeta<string | number, T>>(
    props: CardViewProps<T> & { ref?: React.Ref<CardViewHandle> },
) => JSX.Element;
