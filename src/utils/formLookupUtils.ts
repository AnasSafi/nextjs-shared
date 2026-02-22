import type {MultiLangValue} from "../models/core/localeModels";
import {PaginationModel, SelectOptionModel} from "../models/core/dbModels";

/** Date -> ISO string or null */
export const toIsoOrNull = (d?: Date | null): string | null =>
    d ? d.toISOString() : null;

/** Flatten MultiLangValue to a unique list of strings for searchTexts */
export const mlToStrings = (ml: MultiLangValue): string[] => {
    const set = new Set<string>();

    Object.values(ml ?? {}).forEach((v): void => {
        if (typeof v !== "string") return;

        const s: string = v.trim();
        if (s) set.add(s);
    });

    return Array.from(set);
};

/** Build a PaginationModel<SelectOptionModel> from enum values + labels */
export function toStaticSelectPagination<V extends string>(
    values: readonly V[],
    labels: Record<V, MultiLangValue>,
): PaginationModel {
    const data: SelectOptionModel[] = values.map((v) => ({
        id: v,
        name: labels[v],
        searchTexts: [v, ...mlToStrings(labels[v])],
    }));

    return {
        data,
        pagination: {
            getMorePath: null,
            page: 1,
            pageSize: data.length,
            totalCount: data.length,
            sorts: [],
            sortableFields: [],
            filters: [],
        },
    };
}