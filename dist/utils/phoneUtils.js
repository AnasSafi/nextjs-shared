const BIDI_RE = /[\u200E\u200F\u202A-\u202E]/g;
const E164_MAX = 15;
/** Escape literal text for use inside a RegExp */
function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Convert a single unicode digit to ASCII '0'..'9'; return '' if not a decimal digit */
function toAsciiDigit(ch) {
    const cp = ch.codePointAt(0);
    // ASCII
    if (cp >= 0x30 && cp <= 0x39)
        return ch;
    // Arabic-Indic ٠١٢٣٤٥٦٧٨٩
    if (cp >= 0x0660 && cp <= 0x0669)
        return String(cp - 0x0660);
    // Eastern Arabic-Indic ۰۱۲۳۴۵۶۷۸۹
    if (cp >= 0x06F0 && cp <= 0x06F9)
        return String(cp - 0x06F0);
    // Devanagari ०१२३४५६७८९
    if (cp >= 0x0966 && cp <= 0x096F)
        return String(cp - 0x0966);
    // Fullwidth ０１２３４５６７８９
    if (cp >= 0xFF10 && cp <= 0xFF19)
        return String(cp - 0xFF10);
    return "";
}
/** Extract ASCII digits from a string, converting common unicode digit sets */
function extractAsciiDigits(s) {
    let out = "";
    for (const ch of s) {
        const d = toAsciiDigit(ch);
        if (d)
            out += d;
    }
    return out;
}
/** Remove BiDi marks and trim */
function stripBidi(s) {
    return s.normalize("NFKC").replace(BIDI_RE, "").trim();
}
/** Remove and capture extensions like "ext 123", "x123", "#123" at the end */
function stripExtension(s) {
    // Collect digits in many scripts
    const DIGIT_CLASS = "0-9\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\uFF10-\uFF19";
    const EXT_RE = new RegExp(`(?:\\s|[\\-–—,.])*` + // separators
        `(?:ext\\.?|extension|x|#)\\s*[:\\-]?\\s*([${DIGIT_CLASS}]{1,10})\\s*$`, "iu");
    const m = s.match(EXT_RE);
    if (!m)
        return { body: s };
    const extDigits = extractAsciiDigits(m[1]);
    return { body: s.slice(0, m.index).trim(), ext: extDigits || undefined };
}
/**
 * Sanitize a phone-like string.
 * - Keeps only digits and at most one leading '+'
 * - Optionally converts a leading IDD (e.g., "00" / "011") into '+'
 * - Optionally strips extensions
 */
export function sanitizePhonePro(raw, options) {
    const { convertLeadingIdd = true, forcePlus = "auto", stripExtensions = true, clampE164 = false, } = options ?? {};
    const iddList = convertLeadingIdd
        ? ["00"]
        : !convertLeadingIdd
            ? []
            : convertLeadingIdd;
    const input = raw ?? "";
    const hadBidi = BIDI_RE.test(input);
    let s = stripBidi(input);
    // Strip extension (optional)
    let extension;
    if (stripExtensions) {
        const extRes = stripExtension(s);
        s = extRes.body;
        extension = extRes.ext;
    }
    // Determine if input already begins with '+'
    const hadPlus = /^\s*\+/.test(s);
    // Convert a leading IDD to '+'
    let usedIdd;
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
    const digits = extractAsciiDigits(s);
    // Decide plus policy
    let addPlus = false;
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
    const tooLong = digits.length > E164_MAX;
    const finalDigits = clampE164 ? digits.slice(0, E164_MAX) : digits;
    const normalized = (addPlus ? "+" : "") + finalDigits;
    // Compute 'changed' (ignore trivial whitespace differences)
    const compactInput = input.replace(/\s+/g, "");
    const compactNorm = normalized.replace(/\s+/g, "");
    const changed = compactInput !== compactNorm;
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
export function toGoodPhone(input, opts) {
    if (input == null)
        return "";
    const merged = {
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
    if (digits.length === 0)
        return "";
    return normalized;
}
