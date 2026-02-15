"use client";

import React, {forwardRef, InputHTMLAttributes, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {FieldHeader, baseInputClasses, coerceToDateTimeLocalString} from "./Helpers/fieldShared";
import {TranslateFn} from "../../models/core/localeModels";

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
            t,
            ...props
        }: DateTimeInputProps,
        ref: React.ForwardedRef<HTMLInputElement>
    ): JSX.Element => {
        const inputClassName: string = baseInputClasses(className);
        const formattedInitValue: string =
            typeof initValue === "string"
                ? coerceToDateTimeLocalString(initValue)
                : coerceToDateTimeLocalString(initValue ?? null);

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
                    />
                </div>

                <FormError error={error}/>
            </div>
        );
    }
);

CDateTimeInput.displayName = "CDateTimeInput";
