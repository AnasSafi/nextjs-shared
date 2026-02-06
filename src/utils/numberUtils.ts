export const epsilon: number = 0.5;

/**
 * Formats a number with thousands separators and up to `decimals` fraction digits.
 * - No trailing zeros (uses up to `decimals`, not fixed).
 * - Groups only the integer part (no commas in the fraction).
 * - Handles negatives and -0 consistently.
 */
export function formatNumberWithCommas(value: number | null | undefined, decimals: number = 2): string {
    const n: number = Number(value);
    if (!Number.isFinite(n)) return "0";

    const d: number = Math.max(0, Math.min(20, Math.trunc(decimals)));
    const safe: number = Object.is(n, -0) ? 0 : n;

    // Preferred: Intl with max fraction digits (no padding)
    try {
        return new Intl.NumberFormat("en-US", {
            useGrouping: true,
            minimumFractionDigits: 0,
            maximumFractionDigits: d,
        }).format(safe);
    } catch {
        // Fallback: manual formatting
        const rounded: string = safe.toFixed(d);
        const [intPartRaw, rawFrac = ""] = rounded.split(".");
        let fracPart = rawFrac;

        fracPart = fracPart.replace(/0+$/, "");

        const sign: string = intPartRaw.startsWith("-") ? "-" : "";
        let intAbs: string = sign ? intPartRaw.slice(1) : intPartRaw;

        if (Number(rounded) === 0) {
            intAbs = "0";
        }

        const intWithCommas: string = intAbs.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        return fracPart ? `${sign}${intWithCommas}.${fracPart}` : `${sign}${intWithCommas}`;
    }
}

export function areNumbersApproximatelyEqual(n1: number, n2: number): boolean {
    const difference = Math.abs(n1 - n2);
    return difference < epsilon || n1 >= n2;
}

export const bytesToMB = (bytes: number | null | undefined | bigint): number => {
    if (!bytes) return 0;
    if (typeof bytes === "bigint") return Number(bytes) / (1024 * 1024);
    return bytes / (1024 * 1024);
};

export const isValidInteger = (value: unknown): boolean => {
    return typeof value === "number" && Number.isInteger(value);
};

export function zeroIfNegative(n: number): number {
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function safeDivide(num: number, den: number): number {
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
    return num / den;
}
