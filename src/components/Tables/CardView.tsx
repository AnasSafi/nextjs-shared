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
        <div className="flex flex-col mt-8 md:hidden gap-y-4">
            {data.map((row: T, rI: number): JSX.Element => (
                <div
                    key={rI}
                    className={`
                    ${rowBackgroundClasses(row.variant)}
                    rounded-xl p-4 shadow
                    ring-1 ring-inset ring-gray-200/70 dark:ring-white/10
                    transition-colors
                    ${highlightedIndex === rI ? "bg-green-300/40 dark:bg-green-700/20" : ""}
                  `}
                >
                    <div className="space-y-3">
                        {columns.map((col: Column<T>, cI: number): JSX.Element => (
                            <div key={cI}>
                                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    <div className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1">
                                        {col.title}
                                        {col.tooltip && <TooltipIcon tipText={col.tooltip} />}
                                    </div>
                                    <div className="text-gray-900 dark:text-white font-semibold text-xs sm:text-sm break-words">
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
