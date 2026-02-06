import {isLocaleRTL} from "../i18n/localeMaps";

export type LanguageConfig = {
    code: string;
    displayName: string;
    usedInInput: boolean;
    isRequiredForInput: boolean;
    isInterfaceLanguage: boolean;
    isRTL: boolean;
};

export const getInputLanguages = (languages: LanguageConfig[]): string[] =>
    languages.filter((l) => l.usedInInput).map((l) => l.code);

export const getRequiredInputLanguages = (languages: LanguageConfig[]): string[] =>
    languages.filter((l) => l.isRequiredForInput).map((l) => l.code);

export const getInterfaceLanguages = (languages: LanguageConfig[]): string[] =>
    languages.filter((l) => l.isInterfaceLanguage).map((l) => l.code);

export const isLanguageRTL = (localeCode: string): boolean => isLocaleRTL(localeCode);

export const getLanguagesArray = (params: {
    languages: LanguageConfig[];
    defaultLng: string;
    fallbackLng: string;
}): string[] => {
    const { languages, defaultLng, fallbackLng } = params;

    const hasFallback = languages.some((l) => l.code === fallbackLng);
    const hasDefault = languages.some((l) => l.code === defaultLng);

    if (hasFallback && hasDefault && fallbackLng !== defaultLng) return [fallbackLng, defaultLng];
    if (fallbackLng === defaultLng) return [defaultLng];
    return languages.map((l) => l.code);
};

const escapeRegex = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildLanguagePrefixRegex = (params: {
    languages: LanguageConfig[];
    codes?: string[];
}): RegExp => {
    const { languages, codes } = params;

    const sourceCodes =
        codes && codes.length > 0 ? codes : getInterfaceLanguages(languages);

    const escapedCodes = sourceCodes.map(escapeRegex);

    if (escapedCodes.length === 0) return /^$/;

    return new RegExp(`^/(?:${escapedCodes.join("|")})(?=/|$)`, "i");
};
