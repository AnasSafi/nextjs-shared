export interface WithRowId {
    rowId: string;
    [key: string]: unknown;
}

export interface RepeaterRowModel<T extends WithRowId> {
    sections?: T[];
    toDeleteSections?: string[];
}