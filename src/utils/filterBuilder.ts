import {FilterModel} from "../models/core/dbModels";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export type BackendOp = FilterModel["operation"];
export type ExtendedFilterOp = BackendOp | "in" | "like";

export type UnsupportedOpEncoding =
    | "suffix"
    | "passthroughEq";

export interface FieldConfig<T extends object> {
    /** Body key or a function returning the value */
    key: Extract<keyof T, string> | ((body: T) => unknown);
    /** Rename the field when sending to backend */
    as?: string;
    /** Operation (extended) */
    op?: ExtendedFilterOp;
    /** Transform/normalize the value before sending */
    transform?: (v: unknown, body: T) => unknown;
    /** Conditional inclusion */
    when?: (body: T) => boolean;
}

export interface RangeConfig<T extends object> {
    /** Target field name in the backend */
    field: string;
    /** Body keys for from/to */
    fromKey?: Extract<keyof T, string>;
    toKey?: Extract<keyof T, string>;
    /** Optional transforms */
    transformFrom?: (v: unknown, body: T) => unknown;
    transformTo?: (v: unknown, body: T) => unknown;
}

export interface BuildFiltersOptions {
    /** Encoding strategy for unsupported ops (default: "suffix") */
    encodeUnsupportedOp?: UnsupportedOpEncoding;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export const hasValue = (v: unknown): boolean => {
    if (v === undefined || v === null) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return !(Array.isArray(v) && v.length === 0);
};

const isBackendOp = (op: ExtendedFilterOp): op is BackendOp =>
    op === "=" || op === "!=" || op === ">" || op === "<" || op === ">=" || op === "<=";

const encodeFieldForUnsupportedOp = (
    fieldName: string,
    op: ExtendedFilterOp,
    mode: UnsupportedOpEncoding,
): {field: string; op: BackendOp} => {
    if (isBackendOp(op)) return {field: fieldName, op};
    if (mode === "suffix") {
        const suffix = op === "like" ? "_like" : "_in";
        return {field: `${fieldName}${suffix}`, op: "="};
    }
    return {field: fieldName, op: "="};
};

/* ------------------------------------------------------------------ */
/* Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildFilters<T extends object>(
    body: T,
    fields: FieldConfig<T>[] = [],
    ranges: RangeConfig<T>[] = [],
    options: BuildFiltersOptions = {},
): FilterModel[] {
    const out: FilterModel[] = [];
    const encodeMode = options.encodeUnsupportedOp ?? "suffix";

    // Single-value fields
    for (const f of fields) {
        if (f.when && !f.when(body)) continue;

        const raw: unknown =
            typeof f.key === "function"
                ? f.key(body)
                : (body as Record<string, unknown>)[f.key];

        const val: unknown = f.transform ? f.transform(raw, body) : raw;
        if (!hasValue(val)) continue;

        const baseFieldName: string | undefined =
            typeof f.key === "function"
                ? f.as
                : f.as ?? String(f.key);

        if (!baseFieldName) continue;

        const chosenOp: ExtendedFilterOp = f.op ?? "=";
        const {field, op} = encodeFieldForUnsupportedOp(baseFieldName, chosenOp, encodeMode);

        out.push({
            field,
            value: val as FilterModel["value"],
            operation: op,
        });
    }

    // Ranges (>= from, <= to)
    for (const r of ranges) {
        if (r.fromKey) {
            const rawFrom: unknown = (body as Record<string, unknown>)[r.fromKey];
            const vFrom: unknown = r.transformFrom ? r.transformFrom(rawFrom, body) : rawFrom;
            if (hasValue(vFrom)) {
                out.push({
                    field: r.field,
                    value: vFrom as FilterModel["value"],
                    operation: ">=",
                });
            }
        }
        if (r.toKey) {
            const rawTo: unknown = (body as Record<string, unknown>)[r.toKey];
            const vTo: unknown = r.transformTo ? r.transformTo(rawTo, body) : rawTo;
            if (hasValue(vTo)) {
                out.push({
                    field: r.field,
                    value: vTo as FilterModel["value"],
                    operation: "<=",
                });
            }
        }
    }

    return out;
}