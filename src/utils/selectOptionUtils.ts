import type {SelectOptionModel} from "../models/core/dbModels";

export const idsFromSelectOptions = (
    options: ReadonlyArray<SelectOptionModel> | null | undefined,
): string[] => {
    if (!options?.length) return [];
    const seen = new Set<string>();
    const ids: string[] = [];

    for (const opt of options) {
        const id: string = typeof opt?.id === "string" ? opt.id.trim() : "";
        if (id && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
        }
    }
    return ids;
};
