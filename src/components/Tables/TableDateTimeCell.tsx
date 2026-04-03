"use client";

import React, {type JSX, useMemo} from "react";
import {TooltipIcon} from "../Form/TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";
import {TimeZoneHintMode} from "../../models/ui/tableModels";
import {
    formatListPageDateValue,
    resolveListPageDateTimeZone,
} from "../../utils/dateUtils";
import {isLanguageRTL} from "../../i18n/languageConfigUtils";
import {convertToTwoCharLocale} from "../../i18n/localeMaps";

function injectTimeZoneTemplate(template: string, timeZone: string): string {
    return template.replace(/\{\{\s*timeZone\s*\}\}/g, timeZone);
}

export type TableDateTimeCellProps = {
    value: Date | string;
    locale: string;
    format: "date" | "datetime";
    tableTimeZone?: string | null;
    columnTimeZone?: string | null;
    showTimeZoneHint?: boolean;
    timeZoneHintMode?: TimeZoneHintMode;
    dateFormatOptions?: Intl.DateTimeFormatOptions;
    className?: string;
    t?: TranslateFn;
};

export function TableDateTimeCell({
    value,
    locale,
    format,
    tableTimeZone,
    columnTimeZone,
    showTimeZoneHint,
    timeZoneHintMode = "tooltip",
    dateFormatOptions,
    className = "",
    t,
}: TableDateTimeCellProps): JSX.Element {
    const dateObj: Date = useMemo<Date>(
        () => (typeof value === "string" ? new Date(value) : value),
        [value],
    );

    const timeValue: number = useMemo<number>(() => dateObj.getTime(), [dateObj]);
    const isValidDate: boolean = useMemo<boolean>(
        () => !Number.isNaN(timeValue),
        [timeValue],
    );

    const isRTL: boolean = useMemo<boolean>(() => isLanguageRTL(locale), [locale]);

    const resolvedTimeZone: string | undefined = useMemo<string | undefined>(
        () => resolveListPageDateTimeZone(columnTimeZone, tableTimeZone),
        [columnTimeZone, tableTimeZone],
    );

    const displayValue: string = useMemo<string>(
        () =>
            formatListPageDateValue({
                value: isValidDate ? new Date(timeValue) : value,
                locale,
                format,
                isRTL,
                timeZone: resolvedTimeZone,
                dateFormatOptions,
            }),
        [isValidDate, timeValue, value, locale, format, isRTL, resolvedTimeZone, dateFormatOptions],
    );

    const shouldShowHint: boolean = useMemo<boolean>(() => {
        if (!resolvedTimeZone) return false;
        if (timeZoneHintMode === "none") return false;
        const defaultHint = format === "datetime";
        return showTimeZoneHint ?? defaultHint;
    }, [resolvedTimeZone, timeZoneHintMode, format, showTimeZoneHint]);

    const hintText: string = useMemo<string>(() => {
        if (!resolvedTimeZone) return "";
        const fallbackTemplate = format === "datetime"
            ? "Displayed date and time follow timezone: {{timeZone}}"
            : "Displayed date follows timezone: {{timeZone}}";

        if (!t) return injectTimeZoneTemplate(fallbackTemplate, resolvedTimeZone);

        const translatedTemplate = t("listPageTimeZoneHint");
        const templateToUse = translatedTemplate === "listPageTimeZoneHint"
            ? fallbackTemplate
            : translatedTemplate;

        return injectTimeZoneTemplate(templateToUse, resolvedTimeZone);
    }, [resolvedTimeZone, t, format]);

    const dateTimeParts: {datePart: string; timePart: string} | null = useMemo(() => {
        if (format !== "datetime" || dateFormatOptions) return null;
        const separator = " - ";
        const separatorIndex = displayValue.lastIndexOf(separator);
        if (separatorIndex <= 0) return null;

        const datePart = displayValue.slice(0, separatorIndex).trim();
        const timePart = displayValue.slice(separatorIndex + separator.length).trim();
        if (!datePart || !timePart) return null;

        return {datePart, timePart};
    }, [displayValue, format, dateFormatOptions]);

    const hoverTitle: string = useMemo<string>(() => {
        if (!isValidDate) return String(value);

        try {
            const intlLocale = convertToTwoCharLocale(locale) ?? "en";
            const options: Intl.DateTimeFormatOptions = format === "datetime"
                ? {
                    dateStyle: "full",
                    timeStyle: "short",
                    ...(resolvedTimeZone ? {timeZone: resolvedTimeZone} : {}),
                }
                : {
                    dateStyle: "full",
                    ...(resolvedTimeZone ? {timeZone: resolvedTimeZone} : {}),
                };

            return new Intl.DateTimeFormat(intlLocale, options).format(new Date(timeValue));
        } catch {
            return displayValue;
        }
    }, [isValidDate, value, locale, format, resolvedTimeZone, timeValue, displayValue]);

    if (!isValidDate) {
        return <span className={className}>{String(value)}</span>;
    }

    return (
        <span className="inline-flex items-center gap-1 max-w-full align-middle" dir="ltr">
            <time
                dir="ltr"
                dateTime={new Date(timeValue).toISOString()}
                title={hoverTitle}
                className={[
                    "inline-flex items-center gap-1 tabular-nums whitespace-nowrap [unicode-bidi:isolate]",
                    className,
                ].join(" ")}
            >
                {dateTimeParts ? (
                    <>
                        <bdi>{dateTimeParts.datePart}</bdi>
                        <span className="text-gray-400" aria-hidden="true">•</span>
                        <bdi>{dateTimeParts.timePart}</bdi>
                    </>
                ) : (
                    displayValue
                )}
            </time>

            {shouldShowHint && timeZoneHintMode === "tooltip" && (
                <TooltipIcon tipText={hintText} icon="BsFillClockFill"/>
            )}

            {shouldShowHint && timeZoneHintMode === "inline" && resolvedTimeZone && (
                <span className="text-[11px] text-gray-500 dark:text-gray-300" dir="ltr">
                    (<bdi>{resolvedTimeZone}</bdi>)
                </span>
            )}
        </span>
    );
}
