export type PaginationRequestModel = {
    page?: number;
    pageSize?: number;
    filters?: unknown;
    sort?: string;
    sort_direction?: "asc" | "desc";
};
