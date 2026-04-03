"use client";

import React, {forwardRef, InputHTMLAttributes, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {FieldHeader, baseInputClasses, patchInputChangeEventValue} from "./Helpers/fieldShared";
import {TranslateFn} from "../../models/core/localeModels";
import {
    convertDateTimeLocalInZoneToUtc,
    convertUtcToDateTimeLocalInZone,
    resolvePreferredTimeZone,
} from "../../utils/dateUtils";

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
            onChange,
            t,
            ...props
        }: DateTimeInputProps,
        ref: React.ForwardedRef<HTMLInputElement>
    ): JSX.Element => {
        const inputClassName: string = baseInputClasses(className);
        const resolvedTimeZone = resolvePreferredTimeZone(timeZone);
        const formattedInitValue: string = convertUtcToDateTimeLocalInZone(
            initValue ?? null,
            resolvedTimeZone,
        );
        const timeZoneHintText: string | null = timeZone
            ? t
                ? t("dateTimeInputTimeZoneHint", {
                    timeZone: resolvedTimeZone,
                    interpolation: {escapeValue: false},
                })
                : `Please enter date and time based on the ${resolvedTimeZone} time zone.`
            : null;

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
                    />
                </div>

                <FormError error={error}/>
            </div>
        );
    }
);

CDateTimeInput.displayName = "CDateTimeInput";
