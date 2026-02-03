const BIDI_RE = /[\u200E\u200F\u202A-\u202E]/g;
const E164_MAX = 15;

type ForcePlusMode = "auto" | "always" | "never";

export interface SanitizePhoneOptions {
    /** Convert leading IDD like "00" or "011" into a leading "+" (default: ["00"]) */
    convertLeadingIdd?: boolean | string[]; // true -> ["00"], false -> []
    /** How to handle the "+" sign (default: "auto") */
    forcePlus?: ForcePlusMode;
    /** Strip common extension markers and return them separately (default: true) */
    stripExtensions?: boolean;
    /** Clamp digits length to E.164 max=15 (default: false) */
    clampE164?: boolean;
}

export interface SanitizePhoneResult {
    input: string;           // original raw
    normalized: string;      // digits only (+ optionally at start)
    digits: string;          // digits only (ASCII)
    extension?: string;      // stripped extension digits (if any)
    hadPlus: boolean;        // input had plus at start (before normalization)
    usedIdd?: string;        // which IDD was converted to plus (if any)
    hadBidi: boolean;        // input contained BiDi marks
    tooLong?: boolean;       // digits exceeded 15 (E.164)
    changed: boolean;        // normalized differs from input (ignoring trivial spaces)
}

/** Escape literal text for use inside a RegExp */
function escRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convert a single unicode digit to ASCII '0'..'9'; return '' if not a decimal digit */
function toAsciiDigit(ch: string): string {
    const cp: number = ch.codePointAt(0)!;
    // ASCII
    if (cp >= 0x30 && cp <= 0x39) return ch;
    // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
    if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660);
    // Eastern Arabic-Indic ۰۱۲۳۴۵۶۷۸۹
    if (cp >= 0x06F0 && cp <= 0x06F9) return String(cp - 0x06F0);
    // Devanagari ०१२३४५६७८९
    if (cp >= 0x0966 && cp <= 0x096F) return String(cp - 0x0966);
    // Fullwidth ０１２３４５６７８９
    if (cp >= 0xFF10 && cp <= 0xFF19) return String(cp - 0xFF10);
    return "";
}

/** Extract ASCII digits from a string, converting common unicode digit sets */
function extractAsciiDigits(s: string): string {
    let out: string = "";
    for (const ch of s) {
        const d: string = toAsciiDigit(ch);
        if (d) out += d;
    }
    return out;
}

/** Remove BiDi marks and trim */
function stripBidi(s: string): string {
    return s.normalize("NFKC").replace(BIDI_RE, "").trim();
}

/** Remove and capture extensions like "ext 123", "x123", "#123" at the end */
function stripExtension(s: string): { body: string; ext?: string } {
    // Collect digits in many scripts
    const DIGIT_CLASS = "0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\uFF10-\uFF19";
    const EXT_RE = new RegExp(
        `(?:\\s|[\\-–—,.])*` + // separators
        `(?:ext\\.?|extension|x|#)\\s*[:\\-]?\\s*([${DIGIT_CLASS}]{1,10})\\s*$`,
        "iu"
    );
    const m: RegExpMatchArray | null = s.match(EXT_RE);
    if (!m) return {body: s};
    const extDigits = extractAsciiDigits(m[1]);
    return {body: s.slice(0, m.index).trim(), ext: extDigits || undefined};
}

/**
 * Sanitize a phone-like string.
 * - Keeps only digits and at most one leading '+'
 * - Optionally converts a leading IDD (e.g., "00" / "011") into '+'
 * - Optionally strips extensions
 */
export function sanitizePhonePro(
    raw: string,
    options?: SanitizePhoneOptions
): SanitizePhoneResult {
    const {
        convertLeadingIdd = true,
        forcePlus = "auto",
        stripExtensions = true,
        clampE164 = false,
    } = options ?? {};

    const iddList: string[] =
        convertLeadingIdd
            ? ["00"]
            : !convertLeadingIdd
                ? []
                : convertLeadingIdd;


    const input: string = raw ?? "";
    const hadBidi: boolean = BIDI_RE.test(input);
    let s: string = stripBidi(input);

    // Strip extension (optional)
    let extension: string | undefined;
    if (stripExtensions) {
        const extRes = stripExtension(s);
        s = extRes.body;
        extension = extRes.ext;
    }

    // Determine if input already begins with '+'
    const hadPlus: boolean = /^\s*\+/.test(s);

    // Convert a leading IDD to '+'
    let usedIdd: string | undefined;
    if (!hadPlus && iddList.length > 0) {
        for (const idd of iddList) {
            const re = new RegExp(`^\\s*${escRe(idd)}\\s*`);
            if (re.test(s)) {
                s = s.replace(re, "+");
                usedIdd = idd;
                break;
            }
        }
    }

    // Remove all non-digits (we will rebuild the plus below)
    const digits: string = extractAsciiDigits(s);

    // Decide plus policy
    let addPlus: boolean = false;
    switch (forcePlus) {
        case "always":
            addPlus = true;
            break;
        case "never":
            addPlus = false;
            break;
        case "auto":
        default:
            addPlus = hadPlus || !!usedIdd;
            break;
    }

    // Clamp to E.164 if requested
    const tooLong: boolean = digits.length > E164_MAX;
    const finalDigits: string = clampE164 ? digits.slice(0, E164_MAX) : digits;

    const normalized: string = (addPlus ? "+" : "") + finalDigits;

    // Compute 'changed' (ignore trivial whitespace differences)
    const compactInput: string = input.replace(/\s+/g, "");
    const compactNorm: string = normalized.replace(/\s+/g, "");
    const changed: boolean = compactInput !== compactNorm;

    return {
        input,
        normalized,
        digits: finalDigits,
        extension,
        hadPlus,
        usedIdd,
        hadBidi,
        tooLong: tooLong || undefined,
        changed,
    };
}

/**
 * toGoodPhone
 * - Cleans a phone-like input using sanitizePhonePro
 * - Defaults: convert "00"/"011" → "+", strip extensions, don't clamp to 15
 * - Returns "" if nothing useful remains (e.g., only "+")
 */
export function toGoodPhone(
    input: unknown,
    opts?: SanitizePhoneOptions
): string {
    if (input == null) return "";
    const merged: SanitizePhoneOptions = {
        convertLeadingIdd: ["00", "011"],
        forcePlus: "auto",
        stripExtensions: true,
        clampE164: false,
        ...(opts ?? {}),
    };

    const { normalized, digits } = sanitizePhonePro(String(input), merged);

    if (digits.length === 0 && normalized === "+") {
        return "+";
    }

    if (digits.length === 0) return "";

    return normalized;
}
