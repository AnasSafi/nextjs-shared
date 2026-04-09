"use client";

import React, {useEffect, useState, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {
    createSyntheticInputChangeEvent,
    FieldHeader,
    baseInputClasses,
    patchFormElementChangeEventValue,
    patchInputChangeEventValue,
} from "./Helpers/fieldShared";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TranslateFn} from "../../models/core/localeModels";
import {
    convertDateTimeLocalInZoneToUtc,
    convertUtcToDateTimeLocalInZone,
    resolvePreferredTimeZone,
} from "../../utils/dateUtils";
import {useUserTimeZone} from "../../hooks/userHooks/useUserTimeZone";
import {
    type DateInputDisplayMode,
    type DateTimePart,
    SegmentedDatePartsInput,
} from "./Helpers/dateDisplayModeShared";
import {ReactAriaDateFieldInput} from "./Helpers/dateReactAriaShared";

export interface DateTimeRangeInputProps {
    nameStart: string;
    nameEnd: string;

    labelStart: string;
    labelEnd: string;

    placeholderStart?: string;
    placeholderEnd?: string;

    className?: string;

    error?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;
    errorStart?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;
    errorEnd?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;

    label?: string;
    tipText?: string;
    toText?: string;

    disabledStart?: boolean;
    disabledEnd?: boolean;

    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    isRequiredStart?: boolean;
    isRequiredEnd?: boolean;

    initValueStart?: Date | string | null;
    initValueEnd?: Date | string | null;
    timeZone?: string;
    emitUTCOnChange?: boolean;
    displayMode?: DateInputDisplayMode;
    partOrder?: DateTimePart[];
    yearRange?: {start: number; end: number};

    // translation injection (for required tooltip only)
    t: TranslateFn;
}

export const CDateTimeRangeInput = React.forwardRef<HTMLDivElement, DateTimeRangeInputProps>(
    (
        {
            nameStart,
            nameEnd,
            labelStart,
            labelEnd,
            placeholderStart = "Select start datetime",
            placeholderEnd = "Select end datetime",
            className,
            error,
            errorStart,
            errorEnd,
            label,
            tipText,
            toText = "to",
            disabledStart,
            disabledEnd,
            onChange,
            isRequiredStart,
            isRequiredEnd,
            initValueStart,
            initValueEnd,
            timeZone,
            emitUTCOnChange = true,
            displayMode = "native",
            partOrder,
            yearRange,
            t,
        }: DateTimeRangeInputProps,
        ref: React.ForwardedRef<HTMLDivElement>
    ): JSX.Element => {
        const userTimeZone = useUserTimeZone();
        const effectiveTimeZone: string | undefined =
            typeof timeZone === "string" && timeZone.trim().length > 0
                ? timeZone.trim()
                : userTimeZone;
        const resolvedTimeZone = resolvePreferredTimeZone(effectiveTimeZone);
        const [fromDate, setFromDate] = useState<string>(
            convertUtcToDateTimeLocalInZone(initValueStart ?? null, resolvedTimeZone),
        );
        const [toDate, setToDate] = useState<string>(
            convertUtcToDateTimeLocalInZone(initValueEnd ?? null, resolvedTimeZone),
        );
        const timeZoneHintText: string | null = effectiveTimeZone
            ? t("dateTimeInputTimeZoneHint", {
                timeZone: resolvedTimeZone,
                interpolation: {escapeValue: false},
            })
            : null;

        const inputClassName = baseInputClasses(className);

        useEffect((): void => {
            if (fromDate && toDate && toDate < fromDate) {
                setToDate(fromDate);
            }
        }, [fromDate, toDate]);

        const emitChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
            if (!emitUTCOnChange) {
                onChange(event);
                return;
            }

            const utcValue = convertDateTimeLocalInZoneToUtc(
                event.target.value,
                resolvedTimeZone,
            );
            onChange(patchInputChangeEventValue(event, utcValue));
        };

        const emitSegmentedChange = (
            fieldName: string,
            nextLocalValue: string,
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        ): void => {
            if (!emitUTCOnChange) {
                onChange(
                    patchFormElementChangeEventValue(event, nextLocalValue, {
                        name: fieldName,
                    }),
                );
                return;
            }

            const utcValue = convertDateTimeLocalInZoneToUtc(
                nextLocalValue,
                resolvedTimeZone,
            );
            onChange(
                patchFormElementChangeEventValue(event, utcValue, {
                    name: fieldName,
                }),
            );
        };

        return (
            <div ref={ref}>
                <FieldHeader label={label} tipText={tipText}/>
                {timeZoneHintText && (
                    <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
                        {timeZoneHintText}
                    </p>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2" data-rangepicker="true">
                    <div className="flex-grow relative w-full sm:w-1/2">
                        {labelStart && (
                            <span className="my-2 text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                {labelStart}
                                {isRequiredStart && <RequiredAsterisk t={t}/>}
                            </span>
                        )}

                        {displayMode === "native" ? (
                            <input
                                dir="ltr"
                                name={nameStart}
                                type="datetime-local"
                                className={inputClassName}
                                placeholder={placeholderStart}
                                value={fromDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setFromDate(e.target.value);
                                    emitChange(e);
                                }}
                                disabled={disabledStart}
                            />
                        ) : displayMode === "react-aria" ? (
                            <>
                                <input
                                    type="hidden"
                                    name={nameStart}
                                    value={fromDate}
                                    disabled={disabledStart}
                                    readOnly
                                />
                                <ReactAriaDateFieldInput
                                    kind="datetime"
                                    value={fromDate}
                                    onValueChange={(nextValue) => {
                                        setFromDate(nextValue);
                                        if (!emitUTCOnChange) {
                                            onChange(createSyntheticInputChangeEvent(nameStart, nextValue));
                                            return;
                                        }

                                        const utcValue = convertDateTimeLocalInZoneToUtc(
                                            nextValue,
                                            resolvedTimeZone,
                                        );
                                        onChange(createSyntheticInputChangeEvent(nameStart, utcValue));
                                    }}
                                    className={className}
                                    disabled={disabledStart}
                                    partOrder={partOrder}
                                    yearRange={yearRange}
                                />
                            </>
                        ) : (
                            <>
                                <input
                                    type="hidden"
                                    name={nameStart}
                                    value={fromDate}
                                    disabled={disabledStart}
                                    readOnly
                                />
                                <SegmentedDatePartsInput
                                    kind="datetime"
                                    mode={displayMode}
                                    name={nameStart}
                                    value={fromDate}
                                    onValueChange={(nextValue, event) => {
                                        setFromDate(nextValue);
                                        emitSegmentedChange(nameStart, nextValue, event);
                                    }}
                                    className={className}
                                    disabled={disabledStart}
                                    partOrder={partOrder}
                                    yearRange={yearRange}
                                />
                            </>
                        )}
                        <FormError error={errorStart}/>
                    </div>

                    <div className="flex-none mx-4 text-gray-500">{toText}</div>

                    <div className="flex-grow relative w-full sm:w-1/2">
                        {labelEnd && (
                            <span className="my-2 text-xs font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                {labelEnd}
                                {isRequiredEnd && <RequiredAsterisk t={t}/>}
                            </span>
                        )}

                        {displayMode === "native" ? (
                            <input
                                dir="ltr"
                                name={nameEnd}
                                type="datetime-local"
                                className={inputClassName}
                                placeholder={placeholderEnd}
                                min={fromDate || undefined}
                                value={toDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                                    setToDate(e.target.value);
                                    emitChange(e);
                                }}
                                disabled={disabledEnd}
                            />
                        ) : displayMode === "react-aria" ? (
                            <>
                                <input
                                    type="hidden"
                                    name={nameEnd}
                                    value={toDate}
                                    disabled={disabledEnd}
                                    readOnly
                                />
                                <ReactAriaDateFieldInput
                                    kind="datetime"
                                    value={toDate}
                                    onValueChange={(nextValue) => {
                                        setToDate(nextValue);
                                        if (!emitUTCOnChange) {
                                            onChange(createSyntheticInputChangeEvent(nameEnd, nextValue));
                                            return;
                                        }

                                        const utcValue = convertDateTimeLocalInZoneToUtc(
                                            nextValue,
                                            resolvedTimeZone,
                                        );
                                        onChange(createSyntheticInputChangeEvent(nameEnd, utcValue));
                                    }}
                                    className={className}
                                    disabled={disabledEnd}
                                    partOrder={partOrder}
                                    yearRange={yearRange}
                                    minValue={fromDate || undefined}
                                />
                            </>
                        ) : (
                            <>
                                <input
                                    type="hidden"
                                    name={nameEnd}
                                    value={toDate}
                                    disabled={disabledEnd}
                                    readOnly
                                />
                                <SegmentedDatePartsInput
                                    kind="datetime"
                                    mode={displayMode}
                                    name={nameEnd}
                                    value={toDate}
                                    onValueChange={(nextValue, event) => {
                                        setToDate(nextValue);
                                        emitSegmentedChange(nameEnd, nextValue, event);
                                    }}
                                    className={className}
                                    disabled={disabledEnd}
                                    partOrder={partOrder}
                                    yearRange={yearRange}
                                    minValue={fromDate || undefined}
                                />
                            </>
                        )}
                        <FormError error={errorEnd}/>
                    </div>
                </div>

                <FormError error={error}/>
            </div>
        );
    }
);

CDateTimeRangeInput.displayName = "CDateTimeRangeInput";
