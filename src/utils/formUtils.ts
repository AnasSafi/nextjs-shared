import type {MultiLangValue} from "../models/core/localeModels";
import {getInputLanguages, LanguageConfig} from "../i18n/languageConfigUtils";

/** Build an empty MultiLangValue with all configured input languages. */
export function generateEmptyMultiLangValueFromLanguages(
    languages: LanguageConfig[],
): MultiLangValue {
    return getInputLanguages(languages).reduce((acc, lang) => {
        acc[lang] = "";
        return acc;
    }, {} as MultiLangValue);
}

/** Type guard for MultiLangValue with configured languages. */
export function isMultiLangValueFromLanguages(
    languages: LanguageConfig[],
    value: unknown,
): value is MultiLangValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const rec = value as Record<string, unknown>;
    const langs = getInputLanguages(languages);
    return langs.some((lang) => typeof rec[lang] === "string");
}

/**
 * Normalize any unknown input into a MultiLangValue.
 * - Already-correct objects are returned as-is.
 * - JSON strings are parsed and validated.
 * - Plain strings (without locale context) return an empty MultiLangValue.
 * - Loose objects copy only known language keys.
 */
export function normalizeToMultiLangValueFromLanguages(
    languages: LanguageConfig[],
    input: unknown,
): MultiLangValue {
    if (isMultiLangValueFromLanguages(languages, input)) return input;

    if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input) as unknown;
            if (isMultiLangValueFromLanguages(languages, parsed)) return parsed;
        } catch {
            // ignore invalid JSON
        }
        return generateEmptyMultiLangValueFromLanguages(languages);
    }

    if (input && typeof input === "object" && !Array.isArray(input)) {
        const rec = input as Record<string, unknown>;
        const langs = getInputLanguages(languages);
        const base = generateEmptyMultiLangValueFromLanguages(languages);
        for (const lang of langs) {
            const v = rec[lang];
            if (typeof v === "string") base[lang] = v;
        }
        return base;
    }

    return generateEmptyMultiLangValueFromLanguages(languages);
}