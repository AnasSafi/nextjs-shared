"use client";

import React, {useEffect, useState, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {FieldHeader, baseInputClasses, patchInputChangeEventValue} from "./Helpers/fieldShared";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TranslateFn} from "../../models/core/localeModels";
import {
    convertDateTimeLocalInZoneToUtc,
    convertUtcToDateTimeLocalInZone,
    resolvePreferredTimeZone,
} from "../../utils/dateUtils";

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
            t,
        }: DateTimeRangeInputProps,
        ref: React.ForwardedRef<HTMLDivElement>
    ): JSX.Element => {
        const resolvedTimeZone = resolvePreferredTimeZone(timeZone);
        const [fromDate, setFromDate] = useState<string>(
            convertUtcToDateTimeLocalInZone(initValueStart ?? null, resolvedTimeZone),
        );
        const [toDate, setToDate] = useState<string>(
            convertUtcToDateTimeLocalInZone(initValueEnd ?? null, resolvedTimeZone),
        );
        const timeZoneHintText: string | null = timeZone
            ? t("dateTimeInputTimeZoneHint", {timeZone: resolvedTimeZone})
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
                        <FormError error={errorEnd}/>
                    </div>
                </div>

                <FormError error={error}/>
            </div>
        );
    }
);

CDateTimeRangeInput.displayName = "CDateTimeRangeInput";
