import type {SelectOptionModel} from "../models/core/dbModels";
import type {FilterModel} from "../models/core/dbModels";

const matchOption = (
    list: SelectOptionModel[],
    raw: unknown,
): SelectOptionModel | undefined => {
    const normalized = String(raw).trim().toLowerCase();
    return list.find(
        (o: SelectOptionModel): boolean => o.id.trim().toLowerCase() === normalized,
    );
};

type NumberFieldMap<T extends Record<string, unknown>> = Record<string, keyof T>;

type DropdownConfig<T extends Record<string, unknown>> = {
    options: SelectOptionModel[];
    assignKey: keyof T;
};

export interface MapperConfig<T extends Record<string, unknown>> {
    stringFields: Set<keyof T>;
    numberFieldMap: NumberFieldMap<T>;
    dropdowns: Record<string, DropdownConfig<T>>;
}

export class FilterFormMapper<T extends Record<string, unknown>> {
    constructor(private config: MapperConfig<T>) {}

    map(filters: FilterModel[]): T {
        const formData = {} as T;
        const {stringFields, numberFieldMap, dropdowns} = this.config;

        const assign = <K extends keyof T>(key: K, value: T[K]) => {
            formData[key] = value;
        };

        for (const {field, value} of filters) {
            if (value == null) continue;

            if (stringFields.has(field as keyof T) && typeof value === "string") {
                assign(field as keyof T, value as T[keyof T]);
                continue;
            }

            if (field in numberFieldMap && (typeof value === "number" || typeof value === "string")) {
                const key = numberFieldMap[field];
                assign(key, Number(value) as unknown as T[typeof key]);
                continue;
            }

            const dd = dropdowns[field];
            if (dd) {
                const matched = matchOption(dd.options, value);
                if (matched) assign(dd.assignKey, matched as unknown as T[typeof dd.assignKey]);
            }
        }

        return formData;
    }
}
