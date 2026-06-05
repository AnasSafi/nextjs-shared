import {
    convertToThreeCharLocale,
    convertToTwoCharLocale,
    isAcceptedLocale,
} from "../i18n/localeMaps";
import type {LanguageConfig} from "../i18n/languageConfigUtils";
import type {MultiLangValue} from "../models/core/localeModels";

export type MultiLangValueResolutionInput =
    | MultiLangValue
    | Partial<Record<string, string | null | undefined>>;

export type MultiLangValueByLanguageOptions = {
    fallbackLng?: string;
    defaultLng?: string;
    languages?: ReadonlyArray<Pick<LanguageConfig, "code">>;
};

export function changeLocaleInPath(path: string, locale: string): string {
    const parts = path.split("/");
    const updatedParts = parts.map((part, index) => {
        if (index === 1) return locale;
        return part;
    });
    return updatedParts.join("/");
}

export function dirIso639v3(localeIso639v3: string): "rtl" | "ltr" {
    const rtlLanguages = ["div", "ara", "fas", "pus", "heb"];
    return rtlLanguages.includes(localeIso639v3.toLowerCase()) ? "rtl" : "ltr";
}

export function normalizeMultiLangValue(value: unknown, target: "2" | "3"): MultiLangValue {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const out: Record<string, string> = {};

    for (const [rawKey, rawVal] of Object.entries(value)) {
        const key = String(rawKey).trim().toLowerCase();
        if (!key) continue;

        const str = rawVal === null || rawVal === undefined ? "" : String(rawVal).trim();
        if (str === "") continue;

        let threeChar: string | null = null;

        if (/^[a-z]{3}$/.test(key)) {
            threeChar = key;
        } else if (/^[a-z]{2}$/.test(key)) {
            threeChar = convertToThreeCharLocale(key);
        }

        if (!threeChar) continue;
        if (!isAcceptedLocale(threeChar)) continue;

        const outKey: string | null =
            target === "3"
                ? threeChar
                : (convertToTwoCharLocale(threeChar) ?? null);

        if (!outKey) continue;

        out[outKey] = str;
    }

    return out;
}

const resolveConfiguredLanguageCode = (
    code: string | undefined,
    languages: ReadonlyArray<Pick<LanguageConfig, "code">> | undefined,
): string | undefined => {
    const normalizedCode = code?.trim();
    if (!normalizedCode) return undefined;
    if (!languages) return normalizedCode;

    return languages.find((language) => language.code === normalizedCode)?.code;
};

const isResolvableMultiLangString = (
    value: string | null | undefined,
): value is string => typeof value === "string" && value !== "";

export function getMultiLangValueByLanguage(
    value: MultiLangValueResolutionInput | null | undefined,
    language: string,
    options: MultiLangValueByLanguageOptions = {},
): string {
    if (!value) return "";

    const {fallbackLng, defaultLng, languages} = options;
    const candidateCodes = [language, fallbackLng, defaultLng]
        .map((code) => resolveConfiguredLanguageCode(code, languages))
        .filter((code): code is string => typeof code === "string");

    for (const code of Array.from(new Set(candidateCodes))) {
        const candidateValue = value[code];
        if (isResolvableMultiLangString(candidateValue)) return candidateValue;
    }

    const remainingValues = languages
        ? languages.map((languageConfig) => value[languageConfig.code])
        : Object.values(value);

    for (const candidateValue of remainingValues) {
        if (isResolvableMultiLangString(candidateValue)) return candidateValue;
    }

    return "";
}
