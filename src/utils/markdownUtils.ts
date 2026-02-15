import {getInterfaceLanguages} from "../i18n/languageConfigUtils";

/** Regex fragment used to match an attribute block like {key="value" key2='v2'} with escaping support. */
export const ATTR_BLOCK_RE_FRAGMENT =
    String.raw`\{(?:[^{}"']+|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')*\}`;

/** Parse an attribute block into a key/value object. Supports single/double quotes and \" or \' escapes. */
export const parseAttrBlock = (block?: string): Record<string, string> => {
    if (!block) return {};
    const s = block.trim();
    let i = 0;
    const end = s.length;
    if (s[i] === "{") i++;
    const attrs: Record<string, string> = {};

    while (i < end) {
        while (i < end && /\s/.test(s[i])) i++;
        if (i >= end || s[i] === "}") break;

        const ks = i;
        while (i < end && /[A-Za-z0-9_-]/.test(s[i])) i++;
        const key = s.slice(ks, i);

        while (i < end && /\s/.test(s[i])) i++;
        if (s[i] !== "=") {
            while (i < end && !/\s|}/.test(s[i])) i++;
            continue;
        }
        i++;
        while (i < end && /\s/.test(s[i])) i++;
        if (i >= end) {
            attrs[key] = "";
            break;
        }

        let val = "";
        const q = s[i];
        if (q === '"' || q === "'") {
            i++;
            const buf: string[] = [];
            let esc = false;
            while (i < end) {
                const ch = s[i];
                if (!esc && ch === q) {
                    i++;
                    break;
                }
                if (!esc && ch === "\\") {
                    esc = true;
                    i++;
                    continue;
                }
                buf.push(ch);
                esc = false;
                i++;
            }
            val = buf.join("").replace(/\\(["'\\])/g, "$1");
        } else {
            const vs = i;
            while (i < end && !/\s|}/.test(s[i])) i++;
            val = s.slice(vs, i);
        }

        attrs[key] = val;
        while (i < end && /\s/.test(s[i])) i++;
        if (s[i] === "}") {
            i++;
            break;
        }
    }

    return attrs;
};

export type GetPreferredIso3LangFromDomParams = {
    fallbackLng: string;
    languages: unknown;
};

export const getPreferredIso3LangFromDom = (
    {fallbackLng, languages}: GetPreferredIso3LangFromDomParams,
): string => {
    if (typeof document === "undefined") return fallbackLng;

    const raw = (document.documentElement.lang || "").toLowerCase();
    const iface = new Set(getInterfaceLanguages(languages as any));

    if (iface.has(raw)) return raw;
    if (raw.startsWith("en")) return "eng";
    if (raw.startsWith("ar")) return "ara";
    if (raw.startsWith("he")) return "heb";
    return fallbackLng;
};
