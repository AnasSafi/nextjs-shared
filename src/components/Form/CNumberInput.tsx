"use client";

import React, {forwardRef, InputHTMLAttributes, useEffect, useState} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isInt?: boolean;
    isRequired?: boolean;
    initValue?: string | number;
    name: string;
    id?: string;
    placeholder?: string;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    error?: FieldError | DeepMap<Record<string, unknown>, FieldError> | undefined;
    label?: string;
    min?: number;
    max?: number;
    step?: number;

    // translation injection (required tooltip only)
    t?: TranslateFn;
}

export const CNumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    (
        {
            isInt = false,
            isRequired = false,
            disabled = false,
            initValue,
            description,
            tipText,
            type = "number",
            name,
            id,
            placeholder,
            className = "",
            error,
            label,
            min,
            max,
            step = 1,
            t,
            ...props
        },
        ref
    ) => {
        const [numberValue, setNumberValue] = useState<string>(initValue?.toString() || "");

        useEffect(() => {
            setNumberValue(initValue?.toString() || "");
        }, [initValue]);

        const inputClassName = `bg-gray-50 dark:bg-gray-700 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-gray-500 ${className}`;

        const preventMouseWheel = (e: WheelEvent) => {
            e.preventDefault();
        };

        const handleInputFocus = (e: React.SyntheticEvent) => {
            (e.target as HTMLElement).addEventListener("wheel", preventMouseWheel);
        };

        const handleInputBlur = (e: React.SyntheticEvent) => {
            (e.target as HTMLElement).removeEventListener("wheel", preventMouseWheel);
        };

        return (
            <div>
                <>
                    {label && (
                        <label
                            htmlFor={id}
                            className=" mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
                        >
                            <div>
                                {label}
                                {isRequired && t && <RequiredAsterisk t={t}/>}
                                {tipText && <TooltipIcon tipText={tipText}/>}
                            </div>
                        </label>
                    )}

                    <div className="relative">
                        <input
                            ref={ref}
                            lang="en-US"
                            name={name}
                            type={type}
                            inputMode={isInt ? "numeric" : "decimal"}
                            className={inputClassName}
                            placeholder={placeholder}
                            pattern={isInt ? "^[0-9]*$" : "^[0-9]*\\.?[0-9]*$"}
                            value={numberValue}
                            min={min}
                            max={max}
                            step={step}
                            onChange={(e) => {
                                const value = e.target.value;

                                if (
                                    (value === "" || (isInt ? /^[0-9]*$/.test(value) : /^[0-9]*\.?[0-9]*$/.test(value))) &&
                                    (typeof min === "undefined" || Number(value) >= min) &&
                                    (typeof max === "undefined" || Number(value) <= max)
                                ) {
                                    setNumberValue(value);
                                    if (props.onChange) props.onChange(e);
                                }
                            }}
                            disabled={disabled}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            {...props}
                        />
                    </div>

                    {description && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
                    )}

                    <FormError error={error}/>
                </>
            </div>
        );
    }
);

CNumberInput.displayName = "CNumberInput";
