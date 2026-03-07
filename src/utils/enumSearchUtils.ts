import type {MultiLangValue} from "../models/core/localeModels";
import {normalizeDigitsToEnglish, type SearchPartVariants} from "./multiLangSearchUtils";

const normalizeEnumToken = (value: string): string =>
    normalizeDigitsToEnglish(value)
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "");

const normalizeFreeTextToken = (value: string): string =>
    normalizeDigitsToEnglish(value).toLowerCase();

const hasLabelMatchForAllParts = (
    labelValues: string[],
    parts: SearchPartVariants,
): boolean =>
    parts.every((variants: string[]): boolean =>
        variants.some((variant: string): boolean => {
            const normalizedVariant: string = normalizeFreeTextToken(variant).trim();
            if (!normalizedVariant) return false;
            return labelValues.some((label: string): boolean =>
                normalizeFreeTextToken(label).includes(normalizedVariant),
            );
        }),
    );

export const parseEnumValue = <T extends string>(value: string, enumValues: readonly T[]): T => {
    const normalized = value.trim().toUpperCase();
    const valid = enumValues.find((item: T): boolean => item === normalized);
    if (!valid) {
        throw new Error(`Invalid enum value: ${value}`);
    }
    return valid;
};

export const getMatchedEnumValuesFromSearch = <T extends string>({
    rawSearch,
    parts,
    enumValues,
    labelsByValue,
}: {
    rawSearch: string;
    parts: SearchPartVariants;
    enumValues: readonly T[];
    labelsByValue?: Partial<Record<T, MultiLangValue>>;
}): T[] => {
    const normalizedWhole: string = normalizeEnumToken(rawSearch.trim().replace(/\s+/g, "_"));
    const normalizedParts: string[] = parts
        .map((variants: string[]): string => {
            for (const variant of variants) {
                const normalized: string = normalizeEnumToken(variant);
                if (normalized) return normalized;
            }
            return "";
        })
        .filter(Boolean);

    return enumValues.filter((enumValue: T): boolean => {
        if (normalizedWhole && enumValue.includes(normalizedWhole)) return true;
        if (normalizedParts.length > 0 && normalizedParts.every((part: string): boolean => enumValue.includes(part))) {
            return true;
        }

        if (!labelsByValue || parts.length === 0) return false;
        const labelObject: MultiLangValue | undefined = labelsByValue[enumValue];
        if (!labelObject) return false;
        const labelValues: string[] = Object.values(labelObject).filter(
            (value: string | null | undefined): value is string => !!value?.trim(),
        );
        if (labelValues.length === 0) return false;
        return hasLabelMatchForAllParts(labelValues, parts);
    });
};
