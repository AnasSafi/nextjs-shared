export type FilterOperation = "=" | "!=" | ">" | "<" | ">=" | "<=";

export interface FilterModel {
    field: string;
    value: string | number | boolean | Date;
    readableValue?: string;
    operation: FilterOperation;
}

export interface SortModel {
    field: string;
    operation: "asc" | "desc";
    doClear?: boolean;
}

export interface SortableFieldModel {
    fieldKey: string;
    fieldName: string;
}

export interface PaginationRequestModel {
    getMorePath?: string | null;
    page?: number;
    pageSize?: number;
    totalCount?: number | null;
    sorts?: SortModel[];
    sortableFields?: SortableFieldModel[];
    filters?: FilterModel[];
}
