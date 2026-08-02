import type React from "react";
import type {CellConfig, Column, TableColumnWrapMode} from "../../models/ui/tableModels";

function toCssSize(value: number | string | undefined): string | undefined {
    if (value === undefined) return undefined;
    return typeof value === "number" ? `${value}px` : value;
}

export function getColumnLayoutStyle<T>(column: Column<T>): React.CSSProperties | undefined {
    const layout = column.layout;
    if (!layout) return undefined;

    const style: React.CSSProperties = {};
    const width = toCssSize(layout.width);
    const minWidth = toCssSize(layout.minWidth);
    const maxWidth = toCssSize(layout.maxWidth);

    if (width) style.width = width;
    if (minWidth) style.minWidth = minWidth;
    if (maxWidth) style.maxWidth = maxWidth;

    return Object.keys(style).length > 0 ? style : undefined;
}

export function getDefaultColumnWrapMode(cell: CellConfig | undefined): TableColumnWrapMode {
    switch (cell?.kind) {
        case "date":
        case "dateTime":
        case "media":
        case "number":
            return "nowrap";
        default:
            return "wrap";
    }
}

export function getColumnWrapClass<T>(column: Column<T>): string {
    const wrap = column.layout?.wrap ?? getDefaultColumnWrapMode(column.cell);

    switch (wrap) {
        case "nowrap":
            return "whitespace-nowrap";
        case "truncate":
            return "max-w-64 truncate whitespace-nowrap";
        case "wrap":
        default:
            return "whitespace-normal break-words [overflow-wrap:anywhere]";
    }
}
