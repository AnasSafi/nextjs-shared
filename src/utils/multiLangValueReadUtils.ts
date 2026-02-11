import type {MultiLangValue} from "../models/core/localeModels";
import {parseToMultiLangValue} from "./multiLangValueUtils";

export function getStringFromMultiLangValueByLang(
    value: MultiLangValue | undefined | null,
    langCode?: string,
): string {
    if (value) {
        // Check if the provided language code has a non-empty value.
        if (langCode) {
            if (value[langCode] && value[langCode] !== "") {
                return value[langCode];
            }
        }

        // If not, find the first non-empty language code and return its value.
        for (const lang in value) {
            if (value[lang] && value[lang] !== "") {
                return value[lang];
            }
        }
    }

    // If no non-empty value is found, return empty string.
    return "";
}

export function getStringFromPrismaJson(
    value: unknown,
    iso3Locale?: string,
): string | null {
    if (!value) return null;
    return getStringFromMultiLangValueByLang(parseToMultiLangValue(value), iso3Locale);
}
