import {ConsoleUtils} from "./consoleUtils";
import {toISO8601Format} from "./dateUtils";
import {normalizeMultiLangValue} from "./localeUtils";
import {toGoodPhone} from "./phoneUtils";
import {isValidUUID} from "./uuidUtils";
import type {MultiLangValue} from "../models/core/localeModels";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type Primitive = string | number | boolean | null | undefined;
type JsonObject = Record<string, unknown>;
type Value = Primitive | JsonObject | Value[];

/** Supported filter keys. */
export type Filter =
    | "trim"
    | "emptyStringToNull"
    | "capitalize"
    | "formatDate"
    | "lowercase"
    | "castArray"
    | "enum"
    | "addPlus"
    | "removeSpaces"
    | "toGoodMultiLingualObject"
    | "toGoodMultiLangValue2"
    | "toGoodMultiLangValue3"
    | "valuesToLowerCase"
    | "keysToValidLocaleCode"
    | "toGoodString"
    | "toGoodUUID"
    | "toGoodNumber"
    | "toGoodBoolean"
    | "toEnglishNumber"
    | "toMobileNumber"
    | "toDate"
    | "toGoodListOfUUID"
    | "toGoodNumberArray"
    | "toGoodPhone"
    | "toISO8601Format"
    | "toLaravelDateTime";

/** Per-field filters map. */
export type Filters<T extends object> = Partial<Record<keyof T, Filter | Filter[]>>;

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */

/* -------------------------------------------------------------------------- */

export function sanitize<T extends object>(data: T, filters: Filters<T>): T {
    const result: Partial<T> = {};

    for (const key of Object.keys(data) as (keyof T)[]) {
        const value = data[key] as Value;
        const fieldFilters = filters[key];

        const finalValue =
            fieldFilters == null
                ? value
                : Array.isArray(fieldFilters)
                    ? fieldFilters.reduce<Value>((acc, f) => applyFilter(acc, f), value)
                    : applyFilter(value, fieldFilters);

        (result as Record<keyof T, unknown>)[key] = finalValue as unknown;
    }

    return result as T;
}

export default sanitize;

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */

/* -------------------------------------------------------------------------- */

function applyFilter(value: Value, filter: Filter): Value {
    switch (filter) {
        case "trim":
            return isString(value) ? value.trim() : value;

        case "emptyStringToNull":
            return isString(value) && value.length === 0 ? null : value;

        case "toGoodString":
            return value == null ? "" : String(value).trim();

        case "toGoodUUID":
            return value == null ? null : (isValidUUID(String(value)) ? String(value) : null);

        case "toGoodBoolean":
            return Boolean(value);

        case "toMobileNumber":
            return isString(value) ? value.replace(/[^+\d]/g, "") : value;

        case "toDate":
            if (isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return `${value}T00:00:00.000Z`;
            }
            return value;

        case "toISO8601Format":
            return toISO8601Format(value);

        case "toLaravelDateTime":
            return toLaravelDateTime(value);

        case "toGoodMultiLingualObject":
            return makeGoodMultiLingualObject(value);

        case "toGoodMultiLangValue2":
            return toGoodMultiLangValue2(value);

        case "toGoodMultiLangValue3":
            return toGoodMultiLangValue3(value);

        case "toGoodNumber":
            return toGoodNumber(value);

        case "toEnglishNumber":
            return toEnglishNumber(value);

        case "valuesToLowerCase":
            return valuesToLowerCase(value);

        case "keysToValidLocaleCode":
            return keysToValidLocaleCode(value);

        case "capitalize":
            return isString(value) && value.length > 0
                ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
                : value;

        case "formatDate":
            return value;

        case "lowercase":
            return isString(value) ? value.toLowerCase() : value;

        case "castArray":
            if (isString(value)) {
                try {
                    const parsed = JSON.parse(value) as unknown;
                    return Array.isArray(parsed) ? (parsed as Value[]) : [value];
                } catch (e) {
                    ConsoleUtils.error(`Invalid JSON in castArray: ${String(e)}`);
                    return [value];
                }
            }
            return Array.isArray(value) ? value : [value];

        case "toGoodListOfUUID":
            return toGoodListOfUUID(value);

        case "toGoodNumberArray":
            return toGoodNumberArray(value);

        case "enum":
            return value;

        case "addPlus":
            return isString(value) && value.length > 0 && !value.startsWith("+") ? `+${value}` : value;

        case "toGoodPhone":
            return toGoodPhone(value);

        case "removeSpaces":
            return isString(value) ? value.replace(/\s+/g, "") : value;

        default:
            return value;
    }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */

/* -------------------------------------------------------------------------- */

function isString(v: unknown): v is string {
    return typeof v === "string";
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Convert { [locale]: any } into { [locale]: string }, trimmed; drop falsy. */
function makeGoodMultiLingualObject(value: Value): Record<string, string> {
    if (!isRecord(value)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
        if (v != null) {
            const s = String(v).trim();
            if (s.length > 0) out[k] = s;
        }
    }
    return out;
}

/** Lowercase all string values of an object (shallow); drops non-stringish values. */
function valuesToLowerCase(value: Value): Record<string, string> {
    if (!isRecord(value)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
        if (v != null) out[k] = String(v).toLowerCase();
    }
    return out;
}

/**
 * Keep only 3-letter locale codes (e.g., "ara", "eng"), normalize keys to lowercase.
 * Returns a new object (non-mutating).
 */
function keysToValidLocaleCode(value: Value): Record<string, unknown> {
    if (!isRecord(value)) return {};
    const out: Record<string, unknown> = {};
    const localeCodePattern = /^[a-zA-Z]{3}$/;

    for (const [k, v] of Object.entries(value)) {
        const key = k.toLowerCase();
        if (localeCodePattern.test(key)) {
            out[key] = v;
        }
    }
    return out;
}

/** Robust number coercion; invalid => null. */
function toGoodNumber(value: Value): number | null {
    if (value == null) return null;
    const s: string = String(value).trim();
    if (s.length === 0) return null;
    const num: number = Number(toEnglishNumber(s));
    return Number.isFinite(num) ? num : null;
}

/** Convert Arabic-Indic/Persian digits to English equivalents within a string. */
function toEnglishNumber(value: Value): string {
    const s = value == null ? "" : String(value);

    const map: Record<string, string> = {
        // Arabic-Indic
        "\u0660": "0",
        "\u0661": "1",
        "\u0662": "2",
        "\u0663": "3",
        "\u0664": "4",
        "\u0665": "5",
        "\u0666": "6",
        "\u0667": "7",
        "\u0668": "8",
        "\u0669": "9",
        // Eastern Arabic/Persian
        "\u06F0": "0",
        "\u06F1": "1",
        "\u06F2": "2",
        "\u06F3": "3",
        "\u06F4": "4",
        "\u06F5": "5",
        "\u06F6": "6",
        "\u06F7": "7",
        "\u06F8": "8",
        "\u06F9": "9",
    };

    let out = "";
    for (const ch of s) {
        out += ch in map ? map[ch] : ch;
    }
    return out;
}

/* -------------------------------------------------------------------------- */
/* NEW: toGoodListOfUUID                                                       */

/* -------------------------------------------------------------------------- */

/**
 * Normalize many possible inputs to a clean, deduplicated string[] of valid UUIDs.
 * Accepted inputs:
 * - string: JSON array string ("[...])", or comma/space/newline separated list
 * - array: any array (strings/numbers/etc.); strings can also contain comma-separated lists
 * - everything else: returns []
 * Dedup preserves first-seen order.
 */
function toGoodListOfUUID(value: Value): string[] {
    const bucket: string[] = [];

    // Helper to push valid UUIDs (dedup, keep order)
    const pushIfValid = (candidate: unknown) => {
        if (!candidate) return;
        const s = String(candidate).trim();
        if (s && isValidUUID(s) && !bucket.includes(s)) {
            bucket.push(s);
        }
    };

    // Given a string, try JSON parse if looks like array; otherwise split by separators
    const fromString = (s: string) => {
        const str = s.trim();
        if (!str) return;

        if (str.startsWith("[") && str.endsWith("]")) {
            try {
                const parsed = JSON.parse(str) as unknown;
                if (Array.isArray(parsed)) {
                    for (const item of parsed) pushIfValid(item);
                    return;
                }
            } catch (e) {
                ConsoleUtils.warn?.(`toGoodListOfUUID: invalid JSON array, falling back. ${String(e)}`);
            }
        }

        // Split on commas, whitespace, or newlines; UUIDs remain intact.
        for (const part of str.split(/[\s,]+/)) {
            pushIfValid(part);
        }
    };

    if (isString(value)) {
        fromString(value);
    } else if (Array.isArray(value)) {
        for (const item of value) {
            if (isString(item)) {
                // allow nested comma/space separated within array entries
                fromString(item);
            } else if (Array.isArray(item)) {
                for (const inner of item) pushIfValid(inner);
            } else {
                pushIfValid(item);
            }
        }
    } else {
        // Non-string, non-array → nothing to do
    }

    return bucket;
}

function toGoodMultiLangValue3(value: unknown): MultiLangValue {
    return normalizeMultiLangValue(value, "3");
}

function toGoodMultiLangValue2(value: unknown): MultiLangValue {
    return normalizeMultiLangValue(value, "2");
}

function toGoodNumberArray(value: Value): number[] | null {
    if (!Array.isArray(value)) return null;

    const nums: number[] = value
        .map((v) => {
            const n: number = typeof v === "number" ? v : Number(toEnglishNumber(v));
            return Number.isFinite(n) ? n : null;
        })
        .filter((v): v is number => v !== null);

    return nums.length ? nums : null;
}

function toLaravelDateTime(value: Value): string | null {
    if (value == null) return null;

    const s = String(value).trim();
    if (s.length === 0) return null;

    // datetime-local: "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
    const normalized = s.includes("T") ? s.replace("T", " ") : s;

    // Add seconds if missing: "YYYY-MM-DD HH:mm" => "YYYY-MM-DD HH:mm:00"
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(normalized)) {
        return `${normalized}:00`;
    }

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(normalized)) {
        return normalized;
    }

    // If unknown format, return original normalized string so server validation can catch it
    return normalized;
}
