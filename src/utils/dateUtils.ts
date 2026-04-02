import {convertToTwoCharLocale} from "../i18n/localeMaps";

export type FmtOpts = {
    locale?: string;      // e.g. "ar", "en-US"
    timeZone?: string;    // e.g. "Asia/Amman" | "UTC"
    isRTL?: boolean;      // choose order directly
};

function two(s: string) {
    return s.padStart(2, "0");
}

function byParts(d: Date, locale: string, timeZone: string) {
    const dateFmt = new Intl.DateTimeFormat(convertToTwoCharLocale(locale) ?? "en", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        calendar: "gregory",
        numberingSystem: "latn",
        timeZone,
    }).formatToParts(d);

    const timeFmt = new Intl.DateTimeFormat(convertToTwoCharLocale(locale) ?? "en", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        calendar: "gregory",
        numberingSystem: "latn",
        timeZone,
    }).formatToParts(d);

    const pick =
        (arr: ReturnType<Intl.DateTimeFormat["formatToParts"]>) =>
            (t: Intl.DateTimeFormatPartTypes) =>
                arr.find((p) => p.type === t)?.value ?? "";

    const gd = pick(dateFmt);
    const gt = pick(timeFmt);

    return {
        day: two(gd("day")),
        month: two(gd("month")),
        year: gd("year"),
        hour: two(gt("hour")),
        minute: two(gt("minute")),
    };
}

export const formatDate = (date: Date | string, opts: FmtOpts = {}): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return String(date);

    const locale: string = opts.locale ? convertToTwoCharLocale(opts.locale) ?? "en" : "en";
    const timeZone: string = opts.timeZone ?? "UTC";

    const { day, month, year } = byParts(d, locale, timeZone);

    // RTL => YMD, LTR => DMY (kept exactly as original behavior)
    return !opts.isRTL
        ? `${day}/${month}/${year}`
        : `${year}/${month}/${day}`;
};

export const formatNamedMonth = (date: Date | string, locale: string): string => {
    const dateObj: Date = typeof date === "string" ? new Date(date) : date;

    const day: number = dateObj.getDate();
    const month: string = dateObj.toLocaleString(locale, { month: "short" });
    const year: number = dateObj.getFullYear();

    return `${day} ${month} ${year}`;
};

export const formatDateTime = (date: Date | string, opts: FmtOpts = {}): string => {
    const d: Date = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return String(date);

    const locale: string = opts.locale ? convertToTwoCharLocale(opts.locale) ?? "en" : "en";
    const timeZone: string = opts.timeZone ?? "UTC";

    const { day, month, year, hour, minute } = byParts(d, locale, timeZone);
    const dateStr = !opts.isRTL
        ? `${day}/${month}/${year}`
        : `${year}/${month}/${day}`;

    return `${dateStr} - ${hour}:${minute}`;
};

export const formatNamedDateTime = (date: Date | string, locale: string): string => {
    const dateObj: Date = typeof date === "string" ? new Date(date) : date;
    const day: number = dateObj.getDate();
    const month: string = dateObj.toLocaleString(locale, { month: "short" });
    const year: number = dateObj.getFullYear();
    const hours: string = String(dateObj.getHours()).padStart(2, "0");
    const minutes: string = String(dateObj.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} - ${hours}:${minutes}`;
};

export const formatAsDBDate = (date: Date): string => {
    const year: number = date.getUTCFullYear();
    const month: string = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day: string = String(date.getUTCDate()).padStart(2, "0");

    const hours: string = String(date.getUTCHours()).padStart(2, "0");
    const minutes: string = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds: string = String(date.getUTCSeconds()).padStart(2, "0");
    const milliseconds: string = String(date.getUTCMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
};

export function convertGMTDateToInputFormat(dateString: string | undefined): string {
    if (dateString) {
        const st: string = toISO8601Format(dateString);
        const dateObj = new Date(st);
        const year: number = dateObj.getUTCFullYear();
        const month: string = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const day: string = String(dateObj.getUTCDate()).padStart(2, "0");
        const hour: string = String(dateObj.getUTCHours()).padStart(2, "0");
        const minute: string = String(dateObj.getUTCMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hour}:${minute}`;
    }
    return "";
}

export function toISO8601Format(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }

    const fullISO8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (fullISO8601Pattern.test(value)) {
        return value;
    }

    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(value)) {
        const dateObj = new Date(`${value}T00:00:00.000Z`);
        return dateObj.toISOString();
    }

    const shortDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
    if (shortDateTimePattern.test(value)) {
        const parts: string[] = value.split("T");
        const dateParts: string[] = parts[0].split("-");
        const timeParts: string[] = parts[1].split(":");

        const dateObj = new Date(Date.UTC(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10)
        ));

        return dateObj.toISOString();
    }

    const gmtDateTimePattern = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/;
    if (gmtDateTimePattern.test(value)) {
        const dateObj = new Date(value);
        return dateObj.toISOString();
    }

    return "";
}

export function sameUpToMinute(a: Date, b: Date): boolean {
    return (
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate() &&
        a.getUTCHours() === b.getUTCHours() &&
        a.getUTCMinutes() === b.getUTCMinutes()
    );
}

type DateTimeLocalParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
};

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function isValidTimeZone(zone?: string): zone is string {
    if (!zone) return false;
    try {
        new Intl.DateTimeFormat("en-US", {timeZone: zone}).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function getBrowserTimeZone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return undefined;
    }
}

function parseDateTimeLocalValue(value: string): DateTimeLocalParts | null {
    const m = value.trim().match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
    );
    if (!m) return null;

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = Number(m[4]);
    const minute = Number(m[5]);
    const second = m[6] ? Number(m[6]) : 0;
    const millisecond = m[7] ? Number(m[7].padEnd(3, "0")) : 0;

    const test = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    if (
        Number.isNaN(test.getTime()) ||
        test.getUTCFullYear() !== year ||
        test.getUTCMonth() !== month - 1 ||
        test.getUTCDate() !== day ||
        test.getUTCHours() !== hour ||
        test.getUTCMinutes() !== minute ||
        test.getUTCSeconds() !== second
    ) {
        return null;
    }

    return {year, month, day, hour, minute, second, millisecond};
}

function getDatePartsInZone(date: Date, timeZone: string): DateTimeLocalParts {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        hourCycle: "h23",
        calendar: "gregory",
        numberingSystem: "latn",
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes): number =>
        Number(parts.find((p) => p.type === type)?.value ?? "0");

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
        millisecond: 0,
    };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const zoned = getDatePartsInZone(date, timeZone);
    const asUtcMs = Date.UTC(
        zoned.year,
        zoned.month - 1,
        zoned.day,
        zoned.hour,
        zoned.minute,
        zoned.second,
        zoned.millisecond,
    );
    return asUtcMs - date.getTime();
}

function samePartsAtInstant(
    instantMs: number,
    target: DateTimeLocalParts,
    timeZone: string,
): boolean {
    const zoned = getDatePartsInZone(new Date(instantMs), timeZone);
    return (
        zoned.year === target.year &&
        zoned.month === target.month &&
        zoned.day === target.day &&
        zoned.hour === target.hour &&
        zoned.minute === target.minute &&
        zoned.second === target.second
    );
}

function findMatchingInstantNearGuess(
    guessMs: number,
    target: DateTimeLocalParts,
    timeZone: string,
): number | null {
    const maxMinutes = 180;

    for (let deltaMinutes = 0; deltaMinutes <= maxMinutes; deltaMinutes += 1) {
        const offsets = deltaMinutes === 0 ? [0] : [-deltaMinutes, deltaMinutes];
        for (const offset of offsets) {
            const candidateMs = guessMs + offset * 60_000;
            if (samePartsAtInstant(candidateMs, target, timeZone)) {
                return candidateMs;
            }
        }
    }

    return null;
}

function formatDateTimeLocalFromParts(parts: DateTimeLocalParts): string {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
}

/**
 * Returns a safe preferred time zone.
 * Fallback order: provided IANA zone -> browser zone -> UTC.
 */
export function resolvePreferredTimeZone(timeZone?: string): string {
    if (isValidTimeZone(timeZone)) return timeZone;

    const browserZone = getBrowserTimeZone();
    if (isValidTimeZone(browserZone)) return browserZone;

    return "UTC";
}

/**
 * Converts UTC/parseable datetime value to a datetime-local string in the requested time zone.
 */
export function convertUtcToDateTimeLocalInZone(
    value: Date | string | null | undefined,
    timeZone?: string,
): string {
    if (!value) return "";
    const dateObj = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dateObj.getTime())) return "";

    const resolvedZone = resolvePreferredTimeZone(timeZone);
    const parts = getDatePartsInZone(dateObj, resolvedZone);
    return formatDateTimeLocalFromParts(parts);
}

/**
 * Converts a datetime-local value interpreted in the given time zone to a UTC ISO string.
 */
export function convertDateTimeLocalInZoneToUtc(
    value: string | Date | null | undefined,
    timeZone?: string,
): string {
    if (!value) return "";

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString();
    }

    const localParts = parseDateTimeLocalValue(value);
    if (!localParts) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
    }

    const resolvedZone = resolvePreferredTimeZone(timeZone);
    const targetAsUtcMs = Date.UTC(
        localParts.year,
        localParts.month - 1,
        localParts.day,
        localParts.hour,
        localParts.minute,
        localParts.second,
        localParts.millisecond,
    );

    let guessMs = targetAsUtcMs;

    // Iterate to account for DST shifts at/around the target instant.
    for (let i = 0; i < 6; i += 1) {
        const offsetMs = getTimeZoneOffsetMs(new Date(guessMs), resolvedZone);
        const nextGuess = targetAsUtcMs - offsetMs;
        if (nextGuess === guessMs) break;
        guessMs = nextGuess;
    }

    const exactMatch = findMatchingInstantNearGuess(guessMs, localParts, resolvedZone);
    return new Date(exactMatch ?? guessMs).toISOString();
}
