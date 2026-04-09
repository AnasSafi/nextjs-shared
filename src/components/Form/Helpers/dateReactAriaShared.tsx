"use client";

import React, {type JSX, useEffect, useMemo, useRef} from "react";
import {
    DateField,
    DateInput,
    DateSegment,
    I18nProvider,
    type DateValue,
} from "react-aria-components";
import {parseDate, parseDateTime} from "@internationalized/date";
import clsx from "clsx";
import {baseInputClasses} from "./fieldShared";
import type {DatePart, DateTimePart} from "./dateDisplayModeShared";

type DateInputKind = "date" | "datetime";

export interface ReactAriaDateFieldInputProps {
    kind: DateInputKind;
    value: string;
    onValueChange: (nextValue: string) => void;
    onValueBlur?: (nextValue: string) => void;
    disabled?: boolean;
    className?: string;
    partOrder?: DateTimePart[];
    yearRange?: {start: number; end: number};
    minValue?: string;
    maxValue?: string;
}

function normalizeDateOrder(partOrder?: DateTimePart[]): DatePart[] {
    const result: DatePart[] = [];

    for (const part of partOrder ?? []) {
        if (part !== "day" && part !== "month" && part !== "year") continue;
        if (result.includes(part)) continue;
        result.push(part);
    }

    return result;
}

function resolveLocaleFromDateOrder(partOrder?: DateTimePart[]): string | undefined {
    const order = normalizeDateOrder(partOrder);
    if (order.length < 3) return undefined;

    const signature = order.slice(0, 3).join("-");
    switch (signature) {
        case "day-month-year":
            return "en-GB";
        case "month-day-year":
            return "en-US";
        case "year-month-day":
            return "ja-JP";
        default:
            return undefined;
    }
}

function normalizeYearRange(yearRange?: {start: number; end: number}): {start: number; end: number} | null {
    if (!yearRange) return null;
    if (!Number.isFinite(yearRange.start) || !Number.isFinite(yearRange.end)) return null;

    return yearRange.start <= yearRange.end
        ? {start: yearRange.start, end: yearRange.end}
        : {start: yearRange.end, end: yearRange.start};
}

function withYearRangeBounds(
    kind: DateInputKind,
    minValue?: string,
    maxValue?: string,
    yearRange?: {start: number; end: number},
): {minValue?: string; maxValue?: string} {
    const normalizedRange = normalizeYearRange(yearRange);
    if (!normalizedRange) return {minValue, maxValue};

    const defaultMin = kind === "datetime"
        ? `${String(normalizedRange.start).padStart(4, "0")}-01-01T00:00`
        : `${String(normalizedRange.start).padStart(4, "0")}-01-01`;
    const defaultMax = kind === "datetime"
        ? `${String(normalizedRange.end).padStart(4, "0")}-12-31T23:59`
        : `${String(normalizedRange.end).padStart(4, "0")}-12-31`;

    return {
        minValue: minValue ?? defaultMin,
        maxValue: maxValue ?? defaultMax,
    };
}

function normalizeDateInputValue(value: string): string | null {
    const matched = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
    return matched ? matched[1] : null;
}

function normalizeDateTimeInputValue(value: string): string | null {
    const matched = value.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/);
    return matched ? `${matched[1]}T${matched[2]}:${matched[3]}` : null;
}

function parseIsoToDateValue(kind: DateInputKind, value?: string): DateValue | null {
    if (!value) return null;

    try {
        if (kind === "date") {
            const normalized = normalizeDateInputValue(value);
            if (!normalized) return null;
            return parseDate(normalized);
        }

        const normalized = normalizeDateTimeInputValue(value);
        if (!normalized) return null;
        return parseDateTime(normalized);
    } catch {
        return null;
    }
}

function dateValueToIso(kind: DateInputKind, value: DateValue): string {
    const rawValue = value.toString();

    if (kind === "date") {
        const matched = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
        return matched ? matched[1] : "";
    }

    const matched = rawValue.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
    return matched ? `${matched[1]}T${matched[2]}:${matched[3]}` : "";
}

export function ReactAriaDateFieldInput(
    {
        kind,
        value,
        onValueChange,
        onValueBlur,
        disabled,
        className,
        partOrder,
        yearRange,
        minValue,
        maxValue,
    }: ReactAriaDateFieldInputProps,
): JSX.Element {
    const latestValueRef = useRef<string>(value ?? "");

    useEffect(() => {
        latestValueRef.current = value ?? "";
    }, [value]);

    const localeOverride = useMemo<string | undefined>(
        () => resolveLocaleFromDateOrder(partOrder),
        [partOrder],
    );

    const boundedMinMax = useMemo(
        () => withYearRangeBounds(kind, minValue, maxValue, yearRange),
        [kind, minValue, maxValue, yearRange],
    );

    const parsedValue = useMemo<DateValue | null>(
        () => parseIsoToDateValue(kind, value),
        [kind, value],
    );
    const parsedMinValue = useMemo<DateValue | null>(
        () => parseIsoToDateValue(kind, boundedMinMax.minValue),
        [kind, boundedMinMax.minValue],
    );
    const parsedMaxValue = useMemo<DateValue | null>(
        () => parseIsoToDateValue(kind, boundedMinMax.maxValue),
        [kind, boundedMinMax.maxValue],
    );

    const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>): void => {
        if (!onValueBlur) return;

        const nextFocusedElement = event.relatedTarget as Node | null;
        if (nextFocusedElement && event.currentTarget.contains(nextFocusedElement)) return;

        onValueBlur(latestValueRef.current);
    };

    const dateFieldNode = (
        <DateField
            value={parsedValue as DateValue | null}
            onChange={(nextValue) => {
                const nextIsoValue = nextValue ? dateValueToIso(kind, nextValue) : "";
                latestValueRef.current = nextIsoValue;
                onValueChange(nextIsoValue);
            }}
            granularity={kind === "datetime" ? "minute" : "day"}
            hourCycle={kind === "datetime" ? 24 : undefined}
            shouldForceLeadingZeros
            isDisabled={disabled}
            minValue={parsedMinValue}
            maxValue={parsedMaxValue}
        >
            <DateInput className={clsx(baseInputClasses(className), "flex flex-wrap items-center gap-1")}>
                {(segment) => (
                    <DateSegment
                        segment={segment}
                        className={({type, isPlaceholder, isFocused, isInvalid}) =>
                            clsx(
                                "rounded px-1.5 py-0.5 text-sm outline-none transition",
                                type === "literal"
                                    ? "px-0 text-gray-500 dark:text-gray-400"
                                    : "text-gray-900 dark:text-white",
                                type !== "literal" && isPlaceholder && "text-gray-400 dark:text-gray-400",
                                type !== "literal" && isFocused && "bg-blue-100 dark:bg-gray-600",
                                type !== "literal" && isInvalid && "text-red-600 dark:text-red-400",
                            )
                        }
                    />
                )}
            </DateInput>
        </DateField>
    );

    return (
        <div onBlurCapture={handleBlurCapture}>
            {localeOverride ? (
                <I18nProvider locale={localeOverride}>
                    {dateFieldNode}
                </I18nProvider>
            ) : (
                dateFieldNode
            )}
        </div>
    );
}

