"use client";

import React, {forwardRef, InputHTMLAttributes, JSX} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {FieldHeader, baseInputClasses, formatISO} from "./Helpers/fieldShared";
import {TranslateFn} from "../../models/core/localeModels";

export interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isRequired?: boolean;
    toggleLocale?: () => void;
    formLocale?: string;
    initValue?: string | null | Date;
    name: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    error?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;
    label?: string;
    tipText?: string;
    t?: TranslateFn;
}

export const CDateInput = forwardRef<HTMLInputElement, DateInputProps>(
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
        }: DateInputProps,
        ref: React.ForwardedRef<HTMLInputElement>
    ): JSX.Element => {
        const inputClassName: string = baseInputClasses(className);

        const formattedInitValue: string = formatISO(initValue);

        return (
            <div>
                <FieldHeader
                    id={id}
                    label={label}
                    tipText={tipText}
                    isRequired={isRequired}
                    rightBadgeText={formLocale}
                    onRightBadgeClick={toggleLocale}
                    t={t}
                />

                <div className="relative">
                    <input
                        dir="ltr"
                        ref={ref}
                        type="date"
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

CDateInput.displayName = "CDateInput";
