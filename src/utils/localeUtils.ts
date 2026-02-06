import {
    convertToThreeCharLocale,
    convertToTwoCharLocale,
    isAcceptedLocale,
    type MultiLangValue,
} from "../index";

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
