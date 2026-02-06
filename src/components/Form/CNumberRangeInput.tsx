"use client";

import React, {useState} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";

export interface NumberRangeInputProps {
    isIntStart?: boolean;
    nameStart: string;
    isIntEnd?: boolean;
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
    disabledStart?: boolean;
    disabledEnd?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    tipText?: string;
    isRequiredStart?: boolean;
    isRequiredEnd?: boolean;
    initValueStart?: string;
    initValueEnd?: string;

    // translation injection (optional)
    t?: (key: string) => string;
    toTextKey?: string;
    toText?: string;
}

export const CNumberRangeInput = React.forwardRef<HTMLDivElement, NumberRangeInputProps>(
    (
        {
            nameStart,
            isIntStart = false,
            nameEnd,
            isIntEnd = false,
            labelStart,
            labelEnd,
            placeholderStart,
            placeholderEnd,
            className = "",
            error,
            errorStart,
            errorEnd,
            label,
            disabledStart,
            disabledEnd,
            onChange,
            tipText,
            isRequiredStart,
            isRequiredEnd,
            initValueStart,
            initValueEnd,
            t,
            toTextKey = "to",
            toText,
        }
    ) => {
        const [fromNumber, setFromNumber] = useState<string>(initValueStart?.toString() || "");
        const [toNumber, setToNumber] = useState<string>(initValueEnd?.toString() || "");

        const inputClassName = `bg-gray-50 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 ${className}`;

        const betweenText = toText ?? (t ? t(toTextKey) : "to");

        return (
            <div>
                <>
                    {label && (
                        <label className="mb-2 text-sm font-medium text-gray-900 dark:text-white flex">
                            {label}
                            {tipText && <TooltipIcon tipText={tipText}/>}
                        </label>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 items-center sm:items-start" data-number-rangepicker="true">
                        <div className="flex-grow relative w-full sm:w1/2">
                            {labelStart && (
                                <span className="my-2 text-xs font-medium text-gray-900 dark:text-white flex">
                                    {labelStart}
                                    {isRequiredStart && t && <RequiredAsterisk t={t}/>}
                                </span>
                            )}

                            <input
                                lang="en-US"
                                dir="ltr"
                                name={nameStart}
                                type="text"
                                inputMode={isIntStart ? "numeric" : "decimal"}
                                className={inputClassName}
                                placeholder={placeholderStart}
                                pattern={isIntStart ? "^[0-9]*$" : "^[0-9]*\\.?[0-9]*$"}
                                value={fromNumber}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || (isIntStart ? /^[0-9]*$/.test(value) : /^[0-9]*\.?[0-9]*$/.test(value))) {
                                        setFromNumber(value);
                                        onChange(e);
                                    }
                                }}
                                onBlur={(e) => {
                                    if ((toNumber.length > 0) && (Number(toNumber) <= Number(e.target.value))) {
                                        setFromNumber("");
                                    }
                                }}
                                disabled={disabledStart}
                            />
                            <FormError error={errorStart}/>
                        </div>

                        <div className="flex-none mx-4 text-gray-500 pt-0 lg:pt-10">{betweenText}</div>

                        <div className="flex-grow relative w-full sm:w1/2">
                            {labelEnd && (
                                <span className="my-2 text-xs font-medium text-gray-900 dark:text-white flex">
                                    {labelEnd}
                                    {isRequiredEnd && t && <RequiredAsterisk t={t}/>}
                                </span>
                            )}

                            <input
                                lang="en-US"
                                dir="ltr"
                                name={nameEnd}
                                type="text"
                                inputMode={isIntEnd ? "numeric" : "decimal"}
                                className={inputClassName}
                                placeholder={placeholderEnd}
                                pattern={isIntEnd ? "^[0-9]*$" : "^[0-9]*\\.?[0-9]*$"}
                                value={toNumber}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || (isIntEnd ? /^[0-9]*$/.test(value) : /^[0-9]*\.?[0-9]*$/.test(value))) {
                                        setToNumber(value);
                                        onChange(e);
                                    }
                                }}
                                onBlur={(e) => {
                                    if ((fromNumber.length > 0) && (Number(e.target.value) <= Number(fromNumber))) {
                                        setToNumber("");
                                    }
                                }}
                                disabled={disabledEnd}
                            />
                            <FormError error={errorEnd}/>
                        </div>
                    </div>

                    <FormError error={error}/>
                </>
            </div>
        );
    }
);

CNumberRangeInput.displayName = "CNumberRangeInput";
