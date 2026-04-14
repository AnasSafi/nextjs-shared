import type React from "react";
import type {JSX} from "react";
import type {FilterModel, PaginationRequestModel} from "../core/dbModels";

export interface TableDescriptionModel {
    key: string;
    label: string;
    value: string;
    isHiddenData?: boolean;
}

export interface TableData<D = unknown> {
    pagination: PaginationRequestModel;
    data: D;
}

/* ---------- enums ---------- */
export enum ButtonVariant {
    Primary = "primary",
    Secondary = "secondary",
    Success = "success",
    Info = "info",
    Warning = "warning",
    Danger = "danger",
    Light = "light",
    Dark = "dark",
    Link = "link",
}

export enum RowVariant {
    Primary = "primary",
    Secondary = "secondary",
    Success = "success",
    Info = "info",
    Warning = "warning",
    Danger = "danger",
    Light = "light",
    Dark = "dark",
    Link = "link",
}

/* ---------- cell config ---------- */
interface BaseCellConfig {
    fontColor?: string;
    className?: string;
}

export type TimeZoneHintMode = "tooltip" | "inline" | "none";

type BaseDateTimeCellConfig = BaseCellConfig & {
    timeZone?: string | null;
    showTimeZoneHint?: boolean;
    timeZoneHintMode?: TimeZoneHintMode;
    dateFormatOptions?: Intl.DateTimeFormatOptions;
};

export type CellConfig =
    | ({ kind: "date" } & BaseDateTimeCellConfig)
    | ({ kind: "dateTime" } & BaseDateTimeCellConfig)
    | ({ kind: "multiLang" } & BaseCellConfig)
    | ({
        kind: "media";
        rounded?: boolean;
        showPlayOverlay?: boolean;
        openInModal?: boolean;
        forceImageCover?: boolean;
        preferCoverImage?: boolean;
        fixedSize?: { width: number; height: number };
        fallbackImageSrc?: string;
        fallbackImageSrcs?: string[];
    } & BaseCellConfig)
    | ({ kind: "number" } & BaseCellConfig & { decimals?: number });

/* ---------- column ---------- */
export interface Column<T> {
    title: string;
    field: keyof T;
    tooltip?: string;
    alwaysLTR?: boolean;
    cell?: CellConfig;
}

/* ---------- row-level actions ---------- */
export type RowAction<R = unknown> =
    | {
        type: "clientButton";
        key: string;
        label?: string;
        onClick: (row: R) => void | Promise<void>;
        variant?: ButtonVariant;
        style?: React.CSSProperties;
    }
    | {
        type: "clientLink";
        key: string;
        label: string;
        href: string;
        onClick?: (row: R) => void | Promise<void>;
        variant?: ButtonVariant;
        style?: React.CSSProperties;
    }
    | {
        type: "serverButton";
        key: string;
        label: string;
        clientHandler?: string;
        variant?: ButtonVariant;
        style?: React.CSSProperties;
    }
    | {
        type: "serverLink";
        key: string;
        label: string;
        href: string;
        variant?: ButtonVariant;
        style?: React.CSSProperties;
    };

/* ---------- meta added to each row ---------- */
export interface RowMeta<IdType = string | number, R = unknown> {
    id: IdType;
    variant?: RowVariant | null;
    actions?: RowAction<R>[];
}

export type OpenFilterModalFn = (args: { filters: FilterModel[] }) =>
    Promise<FilterModel[] | null | undefined>;

/* ---------- TablePages component props ---------- */
export interface TableProps<R extends RowMeta<string | number, R>> {
    toDoInTable?: "refresh" | null;
    data: (R & RowMeta<string | number, R>)[];
    setData: React.Dispatch<React.SetStateAction<R[]>>;
    apiPath: string;
    columns: Column<R>[];
    titleKey?: string;
    title?: string;
    descriptionKey?: string;
    description?: string;
    nameOfSumKey?: string;
    tableActions?: TableAction[];
    clientRowActions?: RowAction<R>[];
    nameOfSum?: string;
    requestBodyData?: Record<string, unknown>;
    openFilterModal?: OpenFilterModalFn;
    generalSearchEnabled?: boolean;
    scrollWithWindow?: boolean;
    timeZone?: string | null;
    autoScrollToTableOnPageChange?: boolean;
    autoScrollToTableOnFirstMount?: boolean;
    quickFilters?: (args: TableQuickFilterArgs) => JSX.Element;
    onMetaChange?: (meta: ListMeta) => void;
}

/* ---------- API Response ---------- */
export interface TableApiResponse<T> {
    description?: TableDescriptionModel[];
    pagination: PaginationRequestModel;
    tableRows: (T & RowMeta<string | number, T>)[];
}

/* ---------- actions at the top of the table ---------- */
export interface TableAction {
    key: string;
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
    style?: React.CSSProperties;
}

/* ---------- ListPage component props ---------- */
export interface ListPageProps<R> {
    apiPath: string;
    columns: Column<R>[];
    clientRowActions?: RowAction<R>[];
    tableActions?: TableAction[];
    titleKey?: string;
    title?: string;
    descriptionKey?: string;
    description?: string;
    filterModal?: OpenFilterModalFn;
    requiredPerms?: string[];
    generalSearchEnabled?: boolean;
    scrollWithWindow?: boolean;
    timeZone?: string | null;
    autoScrollToTableOnPageChange?: boolean;
    autoScrollToTableOnFirstMount?: boolean;
    requestBodyData?: Record<string, unknown>;
    toDoInTable?: "refresh" | null;
    nameOfSumKey?: string;
    quickFilters?: (args: TableQuickFilterArgs) => JSX.Element;
    onMetaChange?: (meta: ListMeta) => void;
    tablePermissions?: string[];
}

export interface TableQuickFilterArgs {
    pagination: PaginationRequestModel;
    submitFilters: (f: FilterModel[]) => void;
    resetFilters: () => void;
}

export interface ListMeta {
    description?: TableDescriptionModel[];
    totalCount?: number;
}

export interface ListPageRef<T extends RowMeta<string | number, T>> {
    setData: React.Dispatch<React.SetStateAction<(T & RowMeta<string | number, T>)[]>>;
    flashRowById(id: string | number, flashes?: number, interval?: number): void;
    doAction(actionKey: "refresh"): void;
}

export interface TablePagesHandle {
    flashRowById(id: string | number, flashes?: number, interval?: number): void;
    doAction(actionKey: "refresh"): void;
}
