import type {FilterModel, PaginationModel, SelectOptionModel} from "../models/core/dbModels";
import type {SharedFetchUtil} from "./fetch/types";
import {ServerSuccessModel} from "../models/core/formModels";

export type ComboboxFetchPageArgs = {
    pagination: PaginationModel;
    page: number;
    search: string;
};

export function buildComboboxFetchPagePath(
    {pagination, page, search}: ComboboxFetchPageArgs,
): string {
    const basePath = pagination.pagination.getMorePath as string;

    const qs = new URLSearchParams();
    qs.set("pagination[page]", String(page));
    qs.set("pagination[pageSize]", String(pagination.pagination.pageSize ?? 20));

    const baseFilters: FilterModel[] = Array.isArray(pagination.pagination.filters)
        ? (pagination.pagination.filters as FilterModel[])
        : [];

    const filtersWithoutSearch: FilterModel[] = baseFilters.filter((f) => f.field !== "search");

    const s: string = search.trim();
    const searchFilter: FilterModel | null = s.length > 0
        ? {field: "search", operation: "=", value: s}
        : null;

    const finalFilters: FilterModel[] = searchFilter
        ? [...filtersWithoutSearch, searchFilter]
        : filtersWithoutSearch;

    finalFilters.forEach((f, i) => {
        qs.set(`pagination[filters][${i}][field]`, String(f.field));
        qs.set(`pagination[filters][${i}][operation]`, String(f.operation));

        const v = f.value instanceof Date ? f.value.toISOString() : String(f.value);
        qs.set(`pagination[filters][${i}][value]`, v);

        if (typeof f.readableValue === "string" && f.readableValue.trim().length > 0) {
            qs.set(`pagination[filters][${i}][readableValue]`, f.readableValue);
        }
    });

    return `${basePath}?${qs.toString()}`;
}

export async function fetchComboboxPage(
    fetchUtil: SharedFetchUtil,
    {pagination, page, search}: ComboboxFetchPageArgs,
): Promise<SelectOptionModel[]> {
    const pathWithQs = buildComboboxFetchPagePath({pagination, page, search});

    const res = await fetchUtil<ServerSuccessModel<PaginationModel>>({
        path: pathWithQs,
        method: "GET",
    });

    const payload = res?.success?.data;
    return (payload?.data ?? []) as SelectOptionModel[];
}