import { convertToTwoCharLocale } from "../index";

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
