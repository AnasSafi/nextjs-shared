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
import clsx from "clsx";
import {rowBackgroundClasses} from "./RowBackgroundClasses";
import type {Column, RowAction, RowMeta} from "../../models/ui/tableModels";
import {TooltipIcon} from "../Form/TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";
import {TableCellContent} from "./getTableCellContent";
import TableRowActions from "./TableRowActions";
import TableScrollArea from "./TableScrollArea";
import {getColumnLayoutStyle, getColumnWrapClass} from "./tableColumnLayoutUtils";

export interface TableViewHandle {
    flashRow: (index: number, flashes?: number, interval?: number) => void;
}

export type TableViewProps<T extends RowMeta<string | number, T>> = {
    data: T[];
    columns: Column<T>[];
    timeZone?: string | null;
    clientRowActions?: RowAction<T>[];
    showRowsActions?: boolean;
    tableLabel?: string;

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
        tableLabel,
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
        <div className="mt-8 hidden w-full min-w-0 max-w-full min-[1024px]:block">
            <TableScrollArea label={tableLabel || t("table") || "Table"}>
            <table className="min-w-full w-max table-auto divide-y divide-gray-300 border border-gray-300 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
                <thead>
                <tr>
                    {columns.map((col: Column<T>, i: number): JSX.Element => (
                        <th
                            key={i}
                            style={getColumnLayoutStyle(col)}
                            className={clsx(
                                "py-2.5 px-3 text-center text-sm font-semibold text-gray-900 dark:text-white",
                                "whitespace-normal break-words [overflow-wrap:anywhere]",
                                "@min-[80rem]/table-page:py-3.5 @min-[80rem]/table-page:px-4",
                                col.headerClassName,
                            )}
                        >
                            {col.title}
                            {col.tooltip && <TooltipIcon tipText={col.tooltip} />}
                        </th>
                    ))}
                    {showRowsActions && (
                        <th
                            className={clsx(
                                "sticky end-0 z-[3] border-s border-gray-200 bg-white py-2.5 px-3 text-center text-sm font-semibold text-gray-900",
                                "shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.45)] rtl:shadow-[8px_0_10px_-10px_rgba(0,0,0,0.45)]",
                                "dark:border-gray-700 dark:bg-gray-900 dark:text-white",
                                "@min-[80rem]/table-page:py-3.5 @min-[80rem]/table-page:px-4",
                            )}
                        >
                            {t ? t("rowActions") : "Row Actions"}
                        </th>
                    )}
                </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 text-center dark:divide-gray-700">
                {data.map((row: T, rI: number): JSX.Element => (
                    <tr
                        key={rI}
                        className={`bg-white dark:bg-gray-900 ${rowBackgroundClasses(row.variant)} ${
                            highlightedRow === rI
                                ? "bg-green-300 transition-colors duration-200"
                                : ""
                        }`}
                    >
                        {columns.map((col: Column<T>, cI: number): JSX.Element => (
                            <td
                                key={cI}
                                style={getColumnLayoutStyle(col)}
                                className={clsx(
                                    "min-w-0 py-3 px-3 align-middle text-sm text-gray-900 dark:text-white",
                                    "@min-[80rem]/table-page:py-4 @min-[80rem]/table-page:px-4",
                                    getColumnWrapClass(col),
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
                            </td>
                        ))}

                        {showRowsActions && (
                            <td
                                className={clsx(
                                    "sticky end-0 z-[2] border-s border-gray-200 bg-inherit py-2 px-2 align-middle",
                                    "shadow-[-8px_0_10px_-10px_rgba(0,0,0,0.45)] rtl:shadow-[8px_0_10px_-10px_rgba(0,0,0,0.45)]",
                                    "dark:border-gray-700",
                                    "@min-[80rem]/table-page:py-3 @min-[80rem]/table-page:px-3",
                                )}
                            >
                                <TableRowActions
                                    row={row}
                                    clientRowActions={clientRowActions}
                                    t={t}
                                    displayMode="table"
                                />
                            </td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
            </TableScrollArea>
        </div>
    );
}

export const TableView = forwardRef(TableViewInner) as <T extends RowMeta<
    string | number,
    T
>>(
    props: TableViewProps<T> & { ref?: React.Ref<TableViewHandle> },
) => JSX.Element;
