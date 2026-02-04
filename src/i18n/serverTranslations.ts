import type {ResourceKey, ResourceLanguage} from "i18next";
import {isAcceptedLocale} from "./localeMaps";
import {MultiLangValue, TranslationNode, Translations} from "@/models/core/localeModels";

const ciFindKey = (obj: Record<string, unknown>, seg: string): string | undefined => {
    if (Object.prototype.hasOwnProperty.call(obj, seg)) return seg;
    const wanted = seg.toLowerCase();
    return Object.keys(obj).find((k) => k.toLowerCase() === wanted);
};

const isLeaf = (node: unknown): node is MultiLangValue =>
    typeof node === "object" &&
    node !== null &&
    Object.values(node as Record<string, unknown>).every((v) => typeof v === "string");

const flattenTranslations = (nested: TranslationNode, prefix = ""): ResourceLanguage => {
    const flat: ResourceLanguage = {};
    Object.entries(nested).forEach(([key, value]) => {
        const keyLc = key.toLowerCase();
        const newKey = prefix ? `${prefix}.${keyLc}` : keyLc;

        if (typeof value === "object" && value !== null) {
            Object.assign(flat, flattenTranslations(value as TranslationNode, newKey));
        } else {
            flat[newKey] = value as string;
        }
    });
    return flat;
};

const interpolate = (template: string, vars: Record<string, unknown> = {}): string =>
    template.replace(/{{\s*([^}\s]+)\s*}}/g, (_, k: string) =>
        Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{{${k}}}`,
    );

export type GetTranslationsDeps = {
    rawTranslations: unknown; // your JSON
    defaultLng: string;
    getFallbackLng: () => string; // usually () => defaultLng
    getLocaleFromApp: () => string; // e.g. singleton getter
    getLocaleFromCookies?: () => Promise<string | null> | string | null;
    isAcceptedLocale?: (lng: string) => boolean; // optional override
};

const init = async (lng: string, deps: GetTranslationsDeps) => {
    const translations: Translations = deps.rawTranslations as Translations;
    const flat: ResourceLanguage = flattenTranslations(translations);

    const t = (key: string, variables?: Record<string, unknown>): string => {
        const fullKeyLc = `${key.toLowerCase()}.${lng.toLowerCase()}`;
        const value: ResourceKey = flat[fullKeyLc];
        return typeof value === "string" ? (variables ? interpolate(value, variables) : value) : key;
    };

    const getNestedTranslation = (path: string): MultiLangValue => {
        const segments = path.split(".");
        let node: TranslationNode | undefined = translations;

        for (const seg of segments) {
            if (typeof node === "object" && node !== null) {
                const obj = node as Record<string, TranslationNode>;
                const foundKey = ciFindKey(obj, seg);
                if (foundKey) {
                    node = obj[foundKey];
                    continue;
                }
            }
            return {[deps.defaultLng]: path};
        }

        return isLeaf(node) ? node : {[deps.defaultLng]: path};
    };

    return {t, getNestedTranslation};
};

export async function getServerTranslations(lng: string | null | undefined, deps: GetTranslationsDeps) {
    const cookiesLocale = deps.getLocaleFromCookies ? await deps.getLocaleFromCookies() : null;

    let iso3Locale = lng ?? cookiesLocale ?? deps.getLocaleFromApp();
    const accept = deps.isAcceptedLocale ?? isAcceptedLocale;
    iso3Locale = accept(iso3Locale) ? iso3Locale : deps.getFallbackLng();

    const {t, getNestedTranslation} = await init(iso3Locale, deps);

    return {t, i18n: null as null, iso3Locale, getNestedTranslation};
}
