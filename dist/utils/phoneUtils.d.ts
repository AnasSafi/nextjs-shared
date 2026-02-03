type ForcePlusMode = "auto" | "always" | "never";
export interface SanitizePhoneOptions {
    /** Convert leading IDD like "00" or "011" into a leading "+" (default: ["00"]) */
    convertLeadingIdd?: boolean | string[];
    /** How to handle the "+" sign (default: "auto") */
    forcePlus?: ForcePlusMode;
    /** Strip common extension markers and return them separately (default: true) */
    stripExtensions?: boolean;
    /** Clamp digits length to E.164 max=15 (default: false) */
    clampE164?: boolean;
}
export interface SanitizePhoneResult {
    input: string;
    normalized: string;
    digits: string;
    extension?: string;
    hadPlus: boolean;
    usedIdd?: string;
    hadBidi: boolean;
    tooLong?: boolean;
    changed: boolean;
}
/**
 * Sanitize a phone-like string.
 * - Keeps only digits and at most one leading '+'
 * - Optionally converts a leading IDD (e.g., "00" / "011") into '+'
 * - Optionally strips extensions
 */
export declare function sanitizePhonePro(raw: string, options?: SanitizePhoneOptions): SanitizePhoneResult;
/**
 * toGoodPhone
 * - Cleans a phone-like input using sanitizePhonePro
 * - Defaults: convert "00"/"011" → "+", strip extensions, don't clamp to 15
 * - Returns "" if nothing useful remains (e.g., only "+")
 */
export declare function toGoodPhone(input: unknown, opts?: SanitizePhoneOptions): string;
export {};
