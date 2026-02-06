"use client";

import React, {useEffect, useState, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {
    FieldHeader,
    baseInputClasses,
    FormError,
    formatISO,
    RequiredAsterisk,
} from "@nextjs-shared/shared";

export interface DateRangeInputProps {
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

    // translation injection
    t: (key: string) => string;
}

export const CDateRangeInput = React.forwardRef<HTMLDivElement, DateRangeInputProps>(
    (
        {
            nameStart,
            nameEnd,
            labelStart,
            labelEnd,
            placeholderStart = "Select start date",
            placeholderEnd = "Select end date",
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
            t,
        }: DateRangeInputProps,
        ref: React.ForwardedRef<HTMLDivElement>
    ): JSX.Element => {
        const [fromDate, setFromDate] = useState<string>(formatISO(initValueStart ?? null));
        const [toDate, setToDate] = useState<string>(formatISO(initValueEnd ?? null));

        const inputClassName = baseInputClasses(className);

        useEffect((): void => {
            if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
                setToDate(fromDate);
            }
        }, [fromDate, toDate]);

        return (
            <div ref={ref}>
                <FieldHeader label={label} tipText={tipText}/>

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
                            type="date"
                            className={inputClassName}
                            placeholder={placeholderStart}
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                onChange(e);
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
                            type="date"
                            className={inputClassName}
                            placeholder={placeholderEnd}
                            min={fromDate || undefined}
                            value={toDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                onChange(e);
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

CDateRangeInput.displayName = "CDateRangeInput";
