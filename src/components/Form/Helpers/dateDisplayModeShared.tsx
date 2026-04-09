"use client";

import React, {type JSX, useEffect, useMemo, useRef, useState} from "react";
import {baseInputClasses} from "./fieldShared";
import type {TranslateFn} from "../../../models/core/localeModels";

export type DateInputDisplayMode = "native" | "segmented-select" | "segmented-input" | "react-aria";
export type DatePart = "day" | "month" | "year";
export type DateTimePart = DatePart | "hour" | "minute";
type DateInputKind = "date" | "datetime";
type SegmentedDisplayMode = "segmented-select" | "segmented-input";

const DATE_PARTS: DatePart[] = ["day", "month", "year"];
const DATETIME_PARTS: DateTimePart[] = ["day", "month", "year", "hour", "minute"];

const EMPTY_PARTS: Record<DateTimePart, string> = {
    day: "",
    month: "",
    year: "",
    hour: "",
    minute: "",
};

const PART_PLACEHOLDER: Record<DateTimePart, string> = {
    day: "DD",
    month: "MM",
    year: "YYYY",
    hour: "HH",
    minute: "MM",
};

const PART_LABEL_DEFAULTS: Record<DateTimePart, string> = {
    day: "Day",
    month: "Month",
    year: "Year",
    hour: "Hour",
    minute: "Minute",
};

const PART_LABEL_CANDIDATE_KEYS: Record<DateTimePart, string[]> = {
    day: ["datePartDay", "day"],
    month: ["datePartMonth", "month"],
    year: ["datePartYear", "year"],
    hour: ["datePartHour", "hour"],
    minute: ["datePartMinute", "minute"],
};

function resolvePartLabel(part: DateTimePart, t?: TranslateFn): string {
    if (!t) return PART_LABEL_DEFAULTS[part];

    for (const key of PART_LABEL_CANDIDATE_KEYS[part]) {
        const translated = t(key);
        if (typeof translated !== "string") continue;
        if (!translated.trim()) continue;
        if (translated === key) continue;
        return translated;
    }

    return PART_LABEL_DEFAULTS[part];
}

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function pad4(value: number): string {
    return String(value).padStart(4, "0");
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function resolveMaxDay(yearRaw: string, monthRaw: string): number {
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return 31;
    if (year < 1 || year > 9999 || month < 1 || month > 12) return 31;
    return daysInMonth(year, month);
}

function parseDateParts(value: string | undefined): Record<DateTimePart, string> {
    if (!value || typeof value !== "string") return {...EMPTY_PARTS};
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return {...EMPTY_PARTS};

    return {
        year: m[1],
        month: m[2],
        day: m[3],
        hour: "",
        minute: "",
    };
}

function parseDateTimeParts(value: string | undefined): Record<DateTimePart, string> {
    if (!value || typeof value !== "string") return {...EMPTY_PARTS};
    const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return {...EMPTY_PARTS};

    return {
        year: m[1],
        month: m[2],
        day: m[3],
        hour: m[4],
        minute: m[5],
    };
}

function parseValueByKind(
    kind: DateInputKind,
    value: string | undefined,
): Record<DateTimePart, string> {
    return kind === "datetime" ? parseDateTimeParts(value) : parseDateParts(value);
}

function normalizePartOrder(
    kind: DateInputKind,
    inputOrder?: DateTimePart[],
): DateTimePart[] {
    const allowedParts: DateTimePart[] = kind === "datetime" ? DATETIME_PARTS : DATE_PARTS;
    const result: DateTimePart[] = [];

    for (const part of inputOrder ?? []) {
        if (!allowedParts.includes(part)) continue;
        if (result.includes(part)) continue;
        result.push(part);
    }

    for (const fallbackPart of allowedParts) {
        if (result.includes(fallbackPart)) continue;
        result.push(fallbackPart);
    }

    return result;
}

function normalizeRange(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function normalizePartValue(
    part: DateTimePart,
    rawValue: string,
    mode: SegmentedDisplayMode,
    existingParts: Record<DateTimePart, string>,
): string {
    const numericOnly = rawValue.replace(/\D/g, "");
    if (!numericOnly) return "";

    if (part === "year") {
        const yearTrimmed = numericOnly.slice(0, 4);
        if (mode === "segmented-input" && yearTrimmed.length < 4) return yearTrimmed;

        const year = normalizeRange(Number(yearTrimmed), 1, 9999);
        return mode === "segmented-select" ? pad4(year) : String(year);
    }

    const shortTrimmed = numericOnly.slice(0, 2);
    if (mode === "segmented-input" && shortTrimmed.length < 2) return shortTrimmed;

    const maxDay = resolveMaxDay(existingParts.year, existingParts.month);

    const normalizedNumeric = (() => {
        switch (part) {
            case "month":
                return normalizeRange(Number(shortTrimmed), 1, 12);
            case "day":
                return normalizeRange(Number(shortTrimmed), 1, maxDay);
            case "hour":
                return normalizeRange(Number(shortTrimmed), 0, 23);
            case "minute":
                return normalizeRange(Number(shortTrimmed), 0, 59);
            default:
                return Number(shortTrimmed);
        }
    })();

    return mode === "segmented-select" ? pad2(normalizedNumeric) : String(normalizedNumeric);
}

function normalizeDayAgainstMonth(
    parts: Record<DateTimePart, string>,
    mode: SegmentedDisplayMode,
): Record<DateTimePart, string> {
    if (!parts.day) return parts;
    if (mode === "segmented-input" && parts.day.length < 2) return parts;

    const maxDay = resolveMaxDay(parts.year, parts.month);
    const dayNumber = Number(parts.day);
    if (!Number.isFinite(dayNumber)) return parts;
    if (dayNumber <= maxDay) return parts;

    const clamped = normalizeRange(dayNumber, 1, maxDay);
    return {
        ...parts,
        day: mode === "segmented-select" ? pad2(clamped) : String(clamped),
    };
}

function composeDateValue(parts: Record<DateTimePart, string>): string {
    if (!parts.year || !parts.month || !parts.day) return "";
    if (parts.year.length < 4) return "";

    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
    if (year < 1 || year > 9999) return "";
    if (month < 1 || month > 12) return "";

    const maxDay = daysInMonth(year, month);
    if (day < 1 || day > maxDay) return "";

    return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

function composeDateTimeValue(parts: Record<DateTimePart, string>): string {
    const dateValue = composeDateValue(parts);
    if (!dateValue) return "";
    if (!parts.hour || !parts.minute) return "";

    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
    if (hour < 0 || hour > 23) return "";
    if (minute < 0 || minute > 59) return "";

    return `${dateValue}T${pad2(hour)}:${pad2(minute)}`;
}

function composeValueByKind(kind: DateInputKind, parts: Record<DateTimePart, string>): string {
    return kind === "datetime" ? composeDateTimeValue(parts) : composeDateValue(parts);
}

function resolveYearRange(yearRange?: {start: number; end: number}): {start: number; end: number} {
    const currentYear = new Date().getFullYear();
    const rawStart = yearRange?.start ?? currentYear - 100;
    const rawEnd = yearRange?.end ?? currentYear + 30;

    return rawStart <= rawEnd
        ? {start: rawStart, end: rawEnd}
        : {start: rawEnd, end: rawStart};
}

function buildYearOptions(yearRange?: {start: number; end: number}): string[] {
    const {start, end} = resolveYearRange(yearRange);
    const values: string[] = [];

    for (let year = end; year >= start; year--) {
        values.push(String(year));
    }

    return values;
}

function build2DigitOptions(start: number, end: number): string[] {
    const values: string[] = [];
    for (let value = start; value <= end; value++) {
        values.push(pad2(value));
    }
    return values;
}

const MONTH_OPTIONS: string[] = build2DigitOptions(1, 12);
const HOUR_OPTIONS: string[] = build2DigitOptions(0, 23);
const MINUTE_OPTIONS: string[] = build2DigitOptions(0, 59);

export interface SegmentedDatePartsInputProps {
    kind: DateInputKind;
    mode: SegmentedDisplayMode;
    value: string;
    onValueChange: (
        nextValue: string,
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
    onValueBlur?: (
        nextValue: string,
        event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
    ) => void;
    name?: string;
    className?: string;
    disabled?: boolean;
    partOrder?: DateTimePart[];
    yearRange?: {start: number; end: number};
    minValue?: string;
    maxValue?: string;
    t?: TranslateFn;
}

export function SegmentedDatePartsInput(
    {
        kind,
        mode,
        value,
        onValueChange,
        onValueBlur,
        name,
        className,
        disabled,
        partOrder,
        yearRange,
        minValue,
        maxValue,
        t,
    }: SegmentedDatePartsInputProps,
): JSX.Element {
    const orderedParts = useMemo<DateTimePart[]>(
        () => normalizePartOrder(kind, partOrder),
        [kind, partOrder],
    );
    const [parts, setParts] = useState<Record<DateTimePart, string>>(
        () => parseValueByKind(kind, value),
    );
    const lastEmittedValueRef = useRef<string>(value ?? "");

    useEffect(() => {
        const incomingValue = value ?? "";
        if (incomingValue === lastEmittedValueRef.current) return;
        setParts(parseValueByKind(kind, incomingValue));
    }, [kind, value]);

    const dayOptions = useMemo<string[]>(
        () => build2DigitOptions(1, resolveMaxDay(parts.year, parts.month)),
        [parts.month, parts.year],
    );
    const yearOptions = useMemo<string[]>(
        () => buildYearOptions(yearRange),
        [yearRange],
    );

    const segmentedInputClassName = baseInputClasses(className);

    const applyBoundaries = (
        nextParts: Record<DateTimePart, string>,
    ): {parts: Record<DateTimePart, string>; value: string} => {
        let nextValue = composeValueByKind(kind, nextParts);
        let boundedParts = nextParts;

        if (nextValue && minValue && nextValue < minValue) {
            nextValue = minValue;
            boundedParts = parseValueByKind(kind, minValue);
        }

        if (nextValue && maxValue && nextValue > maxValue) {
            nextValue = maxValue;
            boundedParts = parseValueByKind(kind, maxValue);
        }

        return {parts: boundedParts, value: nextValue};
    };

    const handlePartChange = (
        part: DateTimePart,
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ): void => {
        const normalizedPartValue = normalizePartValue(part, event.target.value, mode, parts);
        const nextRawParts = {
            ...parts,
            [part]: normalizedPartValue,
        };
        const withValidDay = normalizeDayAgainstMonth(nextRawParts, mode);
        const bounded = applyBoundaries(withValidDay);

        setParts(bounded.parts);
        lastEmittedValueRef.current = bounded.value;
        onValueChange(bounded.value, event);
    };

    const handlePartBlur = (
        event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
    ): void => {
        if (!onValueBlur) return;
        onValueBlur(composeValueByKind(kind, parts), event);
    };

    const renderPartWrapper = (part: DateTimePart, control: JSX.Element): JSX.Element => {
        const labelText = resolvePartLabel(part, t);
        const widthClassName = part === "year" ? "min-w-[8rem]" : "min-w-[5.5rem]";

        return (
            <div key={part} className={`flex flex-col items-center gap-1 ${widthClassName}`}>
                {control}
                <span className="text-[11px] leading-none text-gray-500 dark:text-gray-400">
                    {labelText}
                </span>
            </div>
        );
    };

    const renderSelect = (part: DateTimePart): JSX.Element => {
        const options = (() => {
            switch (part) {
                case "day":
                    return dayOptions;
                case "month":
                    return MONTH_OPTIONS;
                case "year":
                    return yearOptions;
                case "hour":
                    return HOUR_OPTIONS;
                case "minute":
                    return MINUTE_OPTIONS;
                default:
                    return [];
            }
        })();

        return renderPartWrapper(
            part,
            (
                <select
                    dir="ltr"
                    name={name}
                    className={segmentedInputClassName}
                    value={parts[part]}
                    onChange={(event) => handlePartChange(part, event)}
                    onBlur={handlePartBlur}
                    disabled={disabled}
                    aria-label={part}
                    data-date-part={part}
                >
                    <option value="">{PART_PLACEHOLDER[part]}</option>
                    {options.map((optionValue) => (
                        <option key={optionValue} value={optionValue}>
                            {optionValue}
                        </option>
                    ))}
                </select>
            ),
        );
    };

    const renderTextInput = (part: DateTimePart): JSX.Element => {
        const maxLength = part === "year" ? 4 : 2;
        const widthClassName = part === "year" ? "max-w-[8rem]" : "max-w-[5.5rem]";

        return renderPartWrapper(
            part,
            (
                <input
                    dir="ltr"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name={name}
                    className={`${segmentedInputClassName} ${widthClassName}`}
                    maxLength={maxLength}
                    placeholder={PART_PLACEHOLDER[part]}
                    value={parts[part]}
                    onChange={(event) => handlePartChange(part, event)}
                    onBlur={handlePartBlur}
                    disabled={disabled}
                    aria-label={part}
                    data-date-part={part}
                />
            ),
        );
    };

    return (
        <div className="flex flex-wrap items-start gap-2">
            {orderedParts.map((part) =>
                mode === "segmented-select" ? renderSelect(part) : renderTextInput(part),
            )}
        </div>
    );
}
