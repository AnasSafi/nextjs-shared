"use client";

import React, {JSX, useMemo} from "react";
import {formatDate, formatDateTime, formatNamedMonth} from "../../utils/dateUtils";
import {isLanguageRTL} from "../../i18n/languageConfigUtils";

export type SharedFormattedDateProps = {
    date: Date | string;
    locale: string; // required (2-char or 3-char)
    format?: "date" | "datetime";
    className?: string;
    timeZone?: string;
};

export default function FormattedDate(
    {
        date,
        locale,
        format = "date",
        className = "",
        timeZone = "UTC",
    }: SharedFormattedDateProps
): JSX.Element {
    const isRTL: boolean = isLanguageRTL(locale);

    const dateObj: Date = useMemo<Date>(() => {
        return typeof date === "string" ? new Date(date) : date;
    }, [date]);

    const timeValue: number = useMemo<number>(() => dateObj.getTime(), [dateObj]);
    const isValidDate: boolean = !isNaN(timeValue);

    const display = useMemo(() => {
        if (!isValidDate) return String(date);
        const d = new Date(timeValue);
        return format === "datetime"
            ? formatDateTime(d, {locale, timeZone, isRTL})
            : formatDate(d, {locale, timeZone, isRTL});
    }, [isValidDate, date, timeValue, format, locale, timeZone, isRTL]);

    if (!isValidDate) return <span className={className}>{String(date)}</span>;

    return (
        <time
            dir={"ltr"}
            dateTime={new Date(timeValue).toISOString()}
            title={formatNamedMonth(new Date(timeValue), locale)}
            className={[
                "inline-block  tabular-nums",
                "[unicode-bidi:isolate]",
                className,
            ].join(" ")}
        >
            {display}
        </time>
    );
}
