import {convertToTwoCharLocale} from "../i18n/localeMaps";
import type {MultiLangValue} from "../models/core/localeModels";

export function parseToMultiLangValue(value: unknown): MultiLangValue {
    if (value === null || value === undefined) return {};
    return value as MultiLangValue;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
    return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function parseToTwoCharMultiLangValue(value: unknown): MultiLangValue {
    if (!isPlainObject(value)) return {};

    const result: MultiLangValue = {};
    for (const key of Object.keys(value)) {
        const twoChar = convertToTwoCharLocale(key);
        if (!twoChar) continue;

        const v = value[key];
        if (typeof v === "string") {
            result[twoChar] = v;
        }
    }
    return result;
}
