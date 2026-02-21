"use client";

import {useCallback, useMemo, useState} from "react";
import {getInputLanguages, isLanguageRTL, LanguageConfig} from "../../i18n/languageConfigUtils";

type Dir = 1 | -1;
type ToggleArg = "next" | "prev" | undefined;

export type UseTranslationHook = () => { currentLng?: string | null };

export function createUseFormLocale(args: {
    languages: LanguageConfig[];
    defaultLng: string;
    useTranslationHook: UseTranslationHook;
}) {
    const {languages, defaultLng, useTranslationHook} = args;

    return function useFormLocale() {
        const {currentLng} = useTranslationHook();

        const locales = useMemo(() => getInputLanguages(languages), []);
        const initialLocale =
            (currentLng && locales.includes(currentLng) && currentLng) ||
            (locales.includes(defaultLng) ? defaultLng : locales[0]);

        const [formLocale, setFormLocale] = useState<string>(initialLocale);

        const cycle = useCallback(
            (dir: Dir = 1) => {
                setFormLocale((prev) => {
                    const idx = locales.indexOf(prev);
                    const next = (idx + dir + locales.length) % locales.length;
                    return locales[next];
                });
            },
            [locales],
        );

        const toggle = useCallback(
            (arg?: ToggleArg) => {
                if (arg === "prev") cycle(-1);
                else cycle(1);
            },
            [cycle],
        );

        const rtl = useMemo(() => isLanguageRTL(formLocale), [formLocale]);

        return {formLocale, setFormLocale, toggle, cycle, locales, rtl};
    };
}