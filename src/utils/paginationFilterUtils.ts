import type {FilterModel} from "../models/core/dbModels";

const getStringEqualsFilterValue = ({
    filters,
    field,
}: {
    filters?: FilterModel[];
    field: string;
}): string | null => {
    const matchedFilter: FilterModel | undefined = filters?.find(
        (filter: FilterModel): boolean =>
            filter.field.toLowerCase() === field.toLowerCase() &&
            filter.operation === "=" &&
            typeof filter.value === "string" &&
            filter.value.trim() !== "",
    );

    return matchedFilter ? (matchedFilter.value as string).trim() : null;
};

export const getGeneralSearchValue = (filters?: FilterModel[]): string | null =>
    getStringEqualsFilterValue({
        filters,
        field: "generalsearch",
    });
