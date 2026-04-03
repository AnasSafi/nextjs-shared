"use client";

import React, {
    useState,
    useImperativeHandle,
    forwardRef,
    useRef,
    useEffect,
    useCallback,
    type JSX,
} from "react";
import {rowBackgroundClasses} from "./RowBackgroundClasses";
import type {Column, RowAction, RowMeta} from "../../models/ui/tableModels";
import {TooltipIcon} from "../Form/TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";
import {TableCellContent} from "./getTableCellContent";
import TableRowActions from "./TableRowActions";

export interface TableViewHandle {
    flashRow: (index: number, flashes?: number, interval?: number) => void;
}

export type TableViewProps<T extends RowMeta<string | number, T>> = {
    data: T[];
    columns: Column<T>[];
    timeZone?: string | null;
    clientRowActions?: RowAction<T>[];
    showRowsActions?: boolean;

    currentLng: string;
    t: TranslateFn;
};

function TableViewInner<T extends RowMeta<string | number, T>>(
    {
        data,
        columns,
        timeZone,
        clientRowActions,
        showRowsActions = false,
        currentLng,
        t,
    }: TableViewProps<T>,
    ref: React.Ref<TableViewHandle>,
): JSX.Element {
    const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
    const blinkTimer: React.RefObject<ReturnType<typeof setInterval> | null> = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearBlink: () => void = useCallback((): void => {
        if (blinkTimer.current) clearInterval(blinkTimer.current);
        blinkTimer.current = null;
        setHighlightedRow(null);
    }, []);

    const flashRow: (index: number, flashes?: number, interval?: number) => void = useCallback(
        (index: number, flashes = 3, interval = 300): void => {
            clearBlink();
            let count = 0;
            setHighlightedRow(index);

            blinkTimer.current = setInterval(() => {
                setHighlightedRow((prev) => (prev === null ? index : null));
                count++;
                if (count >= flashes * 2) clearBlink();
            }, interval);
        },
        [clearBlink],
    );

    useImperativeHandle(ref, () => ({flashRow}), [flashRow]);

    useEffect((): () => void => clearBlink, [clearBlink]);

    return (
        <div className="mt-8 overflow-x-auto hidden md:block">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                <thead>
                <tr>
                    {columns.map((col: Column<T>, i: number): JSX.Element => (
                        <th
                            key={i}
                            className="py-3.5 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white"
                        >
                            {col.title}
                            {col.tooltip && <TooltipIcon tipText={col.tooltip} />}
                        </th>
                    ))}
                    {showRowsActions && (
                        <th className="py-3.5 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                            {t ? t("rowActions") : "Row Actions"}
                        </th>
                    )}
                </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 text-center">
                {data.map((row: T, rI: number): JSX.Element => (
                    <tr
                        key={rI}
                        className={`${rowBackgroundClasses(row.variant)} ${
                            highlightedRow === rI
                                ? "bg-green-300 transition-colors duration-200"
                                : ""
                        }`}
                    >
                        {columns.map((col: Column<T>, cI: number): JSX.Element => (
                            <td
                                key={cI}
                                className="whitespace-nowrap py-4 px-4 text-sm text-gray-900 dark:text-white"
                            >
                                {TableCellContent({
                                    col,
                                    row,
                                    currentLng,
                                    tableTimeZone: timeZone,
                                    t,
                                })}
                            </td>
                        ))}

                        {showRowsActions && (
                            <td className="whitespace-nowrap py-4 px-4">
                                <TableRowActions
                                    row={row}
                                    clientRowActions={clientRowActions}
                                    t={t}
                                />
                            </td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export const TableView = forwardRef(TableViewInner) as <T extends RowMeta<
    string | number,
    T
>>(
    props: TableViewProps<T> & { ref?: React.Ref<TableViewHandle> },
) => JSX.Element;
