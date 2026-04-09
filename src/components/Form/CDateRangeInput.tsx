"use client";

import React, {useEffect, useState, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {
    createSyntheticInputChangeEvent,
    FieldHeader,
    baseInputClasses,
    formatISO,
    patchFormElementChangeEventValue,
} from "./Helpers/fieldShared";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TranslateFn} from "../../models/core/localeModels";
import {
    type DateInputDisplayMode,
    type DatePart,
    SegmentedDatePartsInput,
} from "./Helpers/dateDisplayModeShared";
import {ReactAriaDateFieldInput} from "./Helpers/dateReactAriaShared";

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
    displayMode?: DateInputDisplayMode;
    partOrder?: DatePart[];
    yearRange?: {start: number; end: number};

    // translation injection
    t: TranslateFn;
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
            displayMode = "native",
            partOrder,
            yearRange,
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

                        {displayMode === "native" ? (
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
                                    kind="date"
                                    value={fromDate}
                                    onValueChange={(nextValue) => {
                                        setFromDate(nextValue);
                                        onChange(createSyntheticInputChangeEvent(nameStart, nextValue));
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
                                    kind="date"
                                    mode={displayMode}
                                    name={nameStart}
                                    value={fromDate}
                                    onValueChange={(nextValue, event) => {
                                        setFromDate(nextValue);
                                        onChange(
                                            patchFormElementChangeEventValue(event, nextValue, {
                                                name: nameStart,
                                            }),
                                        );
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
                                    kind="date"
                                    value={toDate}
                                    onValueChange={(nextValue) => {
                                        setToDate(nextValue);
                                        onChange(createSyntheticInputChangeEvent(nameEnd, nextValue));
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
                                    kind="date"
                                    mode={displayMode}
                                    name={nameEnd}
                                    value={toDate}
                                    onValueChange={(nextValue, event) => {
                                        setToDate(nextValue);
                                        onChange(
                                            patchFormElementChangeEventValue(event, nextValue, {
                                                name: nameEnd,
                                            }),
                                        );
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

CDateRangeInput.displayName = "CDateRangeInput";
