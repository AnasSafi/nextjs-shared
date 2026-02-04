"use client";

import {useEffect} from "react";
import i18next, {type InitOptions} from "i18next";
import {initReactI18next, useTranslation as useTranslationOrg} from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

export type ClientTranslationDeps = {
    initOptions: InitOptions;
    getCurrentLng: () => string;
    resourcesImporter: () => Promise<unknown>;
};

let initialized = false;

export function initClientI18n(deps: ClientTranslationDeps) {
    if (initialized) return;
    initialized = true;

    i18next
        .use(initReactI18next)
        .use(resourcesToBackend(deps.resourcesImporter))
        .init({
            ...deps.initOptions,
            lng: undefined,
            detection: {
                order: ["path", "htmlTag", "cookie", "navigator"],
            },
        })
        .then(() => {
        });
}

const runsOnServerSide = typeof window === "undefined";

export function createUseClientTranslation(deps: {
    getCurrentLng: () => string;
}) {
    return function useClientTranslation() {
        const {t: tOrg, i18n} = useTranslationOrg();
        const currentLng = deps.getCurrentLng();

        const t = (key: string, variables?: object): string => {
            const translationKey = `${key}.${currentLng}`;
            const translation = tOrg(translationKey, variables as any);
            return i18n.exists(translationKey) ? translation.toString() : key;
        };

        useEffect(() => {
            if (!runsOnServerSide || i18n.resolvedLanguage !== currentLng) {
                i18n.changeLanguage(currentLng).then(() => {
                });
            }
        }, [currentLng, i18n]);

        return {t, i18n, currentLng};
    };
}
