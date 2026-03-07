import type {LanguageConfig} from "../i18n/languageConfigUtils";
import {getInputLanguages} from "../i18n/languageConfigUtils";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const DEFAULT_REQUIRED_SEARCH_LANGS = ["heb"];

export type SearchPartVariants = string[][];

export const normalizeDigitsToEnglish = (value: string): string =>
    value.replace(/[٠-٩۰-۹]/g, (char: string): string => {
        const arabicIndex: number = ARABIC_INDIC_DIGITS.indexOf(char);
        if (arabicIndex >= 0) return String(arabicIndex);

        const easternIndex: number = EASTERN_ARABIC_DIGITS.indexOf(char);
        if (easternIndex >= 0) return String(easternIndex);

        return char;
    });

export const toArabicIndicDigits = (value: string): string =>
    value.replace(/[0-9]/g, (char: string): string => {
        const index: number = Number(char);
        return ARABIC_INDIC_DIGITS[index] ?? char;
    });

export const buildSearchPartVariants = (rawSearch: string): SearchPartVariants =>
    rawSearch
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part: string): string[] => {
            const base: string = part.toLowerCase();
            const englishDigits: string = normalizeDigitsToEnglish(base);
            const arabicDigits: string = toArabicIndicDigits(englishDigits);

            return Array.from(
                new Set(
                    [base, englishDigits, arabicDigits].filter(
                        (variant: string): boolean => variant.trim() !== "",
                    ),
                ),
            );
        })
        .filter((variants: string[]): boolean => variants.length > 0);

export function createMultiLangSearchUtils(languages: LanguageConfig[]) {
    const getSearchLanguageCodes = (
        requiredCodes: string[] = DEFAULT_REQUIRED_SEARCH_LANGS,
    ): string[] => {
        const inputLanguages: string[] = getInputLanguages(languages);
        return Array.from(
            new Set(
                [...inputLanguages, ...requiredCodes].filter(
                    (code: string): boolean => code.trim() !== "",
                ),
            ),
        );
    };

    const buildMultiLangJsonContainsFilter = <TWhereInput>({
        fieldKey,
        parts,
        searchLanguages = getSearchLanguageCodes(),
        mode = "insensitive",
    }: {
        fieldKey: string;
        parts: SearchPartVariants;
        searchLanguages?: string[];
        mode?: "default" | "insensitive";
    }): TWhereInput | null => {
        if (parts.length === 0) return null;
        if (searchLanguages.length === 0) return null;

        const orPerLanguage = searchLanguages.map((langCode: string) => ({
            AND: parts.map((variants: string[]) => ({
                OR: variants.map((part: string) => ({
                    [fieldKey]: {
                        path: [langCode],
                        string_contains: part,
                        mode,
                    },
                })),
            })),
        }));

        return {OR: orPerLanguage} as TWhereInput;
    };

    return {
        getSearchLanguageCodes,
        buildMultiLangJsonContainsFilter,
    };
}
