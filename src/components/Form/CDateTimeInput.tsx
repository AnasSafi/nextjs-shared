"use client";

import React, {forwardRef, InputHTMLAttributes, JSX, useEffect, useState} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {
    createSyntheticInputChangeEvent,
    createSyntheticInputFocusEvent,
    FieldHeader,
    baseInputClasses,
    patchFormElementChangeEventValue,
    patchFormElementFocusEventValue,
    patchInputChangeEventValue,
} from "./Helpers/fieldShared";
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

export interface DateTimeInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isRequired?: boolean;
    toggleLocale?: () => void;
    formLocale?: string;
    initValue?: string | Date | null;
    name: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    error?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;
    label?: string;
    tipText?: string;
    timeZone?: string;
    emitUTCOnChange?: boolean;
    displayMode?: DateInputDisplayMode;
    partOrder?: DateTimePart[];
    yearRange?: {start: number; end: number};

    // translation injection (for required tooltip only)
    t?: TranslateFn;
}

export const CDateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(
    (
        {
            isRequired = false,
            toggleLocale,
            formLocale,
            disabled = false,
            initValue,
            name,
            id,
            className,
            error,
            label,
            tipText,
            timeZone,
            emitUTCOnChange = true,
            displayMode = "native",
            partOrder,
            yearRange,
            onChange,
            onBlur,
            t,
            ...props
        }: DateTimeInputProps,
        ref: React.ForwardedRef<HTMLInputElement>
    ): JSX.Element => {
        const inputClassName: string = baseInputClasses(className);
        const userTimeZone = useUserTimeZone();
        const effectiveTimeZone: string | undefined =
            typeof timeZone === "string" && timeZone.trim().length > 0
                ? timeZone.trim()
                : userTimeZone;
        const resolvedTimeZone = resolvePreferredTimeZone(effectiveTimeZone);
        const formattedInitValue: string = convertUtcToDateTimeLocalInZone(
            initValue ?? null,
            resolvedTimeZone,
        );
        const controlledValue = typeof props.value === "string" ? props.value : undefined;
        const defaultValueFromProps = typeof props.defaultValue === "string"
            ? props.defaultValue
            : undefined;
        const [segmentedValue, setSegmentedValue] = useState<string>(
            controlledValue ?? defaultValueFromProps ?? formattedInitValue,
        );
        const timeZoneHintText: string | null = effectiveTimeZone
            ? t
                ? t("dateTimeInputTimeZoneHint", {
                    timeZone: resolvedTimeZone,
                    interpolation: {escapeValue: false},
                })
                : `Please enter date and time based on the ${resolvedTimeZone} time zone.`
            : null;

        useEffect(() => {
            if (displayMode === "native") return;

            if (controlledValue !== undefined) {
                setSegmentedValue(controlledValue);
                return;
            }

            setSegmentedValue(defaultValueFromProps ?? formattedInitValue);
        }, [displayMode, controlledValue, defaultValueFromProps, formattedInitValue]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
            if (!onChange) return;
            if (!emitUTCOnChange) {
                onChange(e);
                return;
            }

            const utcValue = convertDateTimeLocalInZoneToUtc(
                e.target.value,
                resolvedTimeZone,
            );
            onChange(patchInputChangeEventValue(e, utcValue));
        };

        const handleSegmentedChange = (
            nextLocalValue: string,
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        ): void => {
            setSegmentedValue(nextLocalValue);
            if (!onChange) return;

            if (!emitUTCOnChange) {
                onChange(
                    patchFormElementChangeEventValue(event, nextLocalValue, {name}),
                );
                return;
            }

            const utcValue = convertDateTimeLocalInZoneToUtc(
                nextLocalValue,
                resolvedTimeZone,
            );
            onChange(
                patchFormElementChangeEventValue(event, utcValue, {name}),
            );
        };

        const handleSegmentedBlur = (
            nextLocalValue: string,
            event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
        ): void => {
            if (!onBlur) return;

            if (!emitUTCOnChange) {
                onBlur(
                    patchFormElementFocusEventValue(event, nextLocalValue, {name}),
                );
                return;
            }

            const utcValue = convertDateTimeLocalInZoneToUtc(
                nextLocalValue,
                resolvedTimeZone,
            );
            onBlur(
                patchFormElementFocusEventValue(event, utcValue, {name}),
            );
        };

        return (
            <div>
                <FieldHeader
                    id={id}
                    label={label}
                    tipText={tipText}
                    isRequired={isRequired}
                    t={t}
                    rightBadgeText={formLocale}
                    onRightBadgeClick={toggleLocale}
                />
                {timeZoneHintText && (
                    <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
                        {timeZoneHintText}
                    </p>
                )}

                <div className="relative">
                    {displayMode === "native" ? (
                        <input
                            dir="ltr"
                            ref={ref}
                            type="datetime-local"
                            name={name}
                            id={id}
                            className={inputClassName}
                            disabled={disabled}
                            defaultValue={formattedInitValue}
                            {...props}
                            onChange={handleChange}
                            onBlur={onBlur}
                        />
                    ) : displayMode === "react-aria" ? (
                        <>
                            <input
                                ref={ref}
                                type="hidden"
                                name={name}
                                id={id}
                                value={segmentedValue}
                                disabled={disabled}
                                required={props.required}
                                readOnly
                            />
                            <ReactAriaDateFieldInput
                                kind="datetime"
                                value={segmentedValue}
                                onValueChange={(nextLocalValue) => {
                                    setSegmentedValue(nextLocalValue);
                                    if (!onChange) return;

                                    if (!emitUTCOnChange) {
                                        onChange(createSyntheticInputChangeEvent(name, nextLocalValue));
                                        return;
                                    }

                                    const utcValue = convertDateTimeLocalInZoneToUtc(
                                        nextLocalValue,
                                        resolvedTimeZone,
                                    );
                                    onChange(createSyntheticInputChangeEvent(name, utcValue));
                                }}
                                onValueBlur={(nextLocalValue) => {
                                    if (!onBlur) return;

                                    if (!emitUTCOnChange) {
                                        onBlur(createSyntheticInputFocusEvent(name, nextLocalValue));
                                        return;
                                    }

                                    const utcValue = convertDateTimeLocalInZoneToUtc(
                                        nextLocalValue,
                                        resolvedTimeZone,
                                    );
                                    onBlur(createSyntheticInputFocusEvent(name, utcValue));
                                }}
                                className={className}
                                disabled={disabled}
                                partOrder={partOrder}
                                yearRange={yearRange}
                                minValue={typeof props.min === "string" ? props.min : undefined}
                                maxValue={typeof props.max === "string" ? props.max : undefined}
                            />
                        </>
                    ) : (
                        <>
                            <input
                                ref={ref}
                                type="hidden"
                                name={name}
                                id={id}
                                value={segmentedValue}
                                disabled={disabled}
                                required={props.required}
                                readOnly
                            />
                            <SegmentedDatePartsInput
                                kind="datetime"
                                mode={displayMode}
                                name={name}
                                value={segmentedValue}
                                onValueChange={handleSegmentedChange}
                                onValueBlur={handleSegmentedBlur}
                                className={className}
                                disabled={disabled}
                                partOrder={partOrder}
                                yearRange={yearRange}
                                minValue={typeof props.min === "string" ? props.min : undefined}
                                maxValue={typeof props.max === "string" ? props.max : undefined}
                            />
                        </>
                    )}
                </div>

                <FormError error={error}/>
            </div>
        );
    }
);

CDateTimeInput.displayName = "CDateTimeInput";
