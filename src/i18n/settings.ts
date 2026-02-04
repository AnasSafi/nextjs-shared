export const defaultNS = "translation";

export function getI18nOptions(params: {
    fallbackLng: string;
    supportedLngs: string[];
    lng?: string;
    ns?: string;
}) {
    const { fallbackLng, supportedLngs, lng = fallbackLng, ns = defaultNS } = params;
    return {
        supportedLngs,
        fallbackLng,
        lng,
        fallbackNS: defaultNS,
        defaultNS,
        ns,
    };
}
