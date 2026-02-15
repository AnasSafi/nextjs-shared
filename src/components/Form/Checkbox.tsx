"use client";

import React, {ChangeEvent, JSX, useState} from "react";
import type {RHFFieldError} from "../../models/core/formModels";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";

export interface CheckboxProps {
    isRequired?: boolean;
    id: string;
    name?: string;
    label: string;
    tipText?: string;
    disabled?: boolean;
    error?: RHFFieldError | undefined;
    initialValue?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>, shouldDelete: boolean) => void;
    value?: string | number;

    // translation injection (for required tooltip only)
    t?: TranslateFn;
}

const CheckboxInner: React.ForwardRefRenderFunction<HTMLInputElement, CheckboxProps> = (
    {
        isRequired = false,
        initialValue = false,
        id,
        label,
        tipText,
        error,
        disabled,
        onChange,
        name,
        value,
        t,
    }: CheckboxProps,
    ref: React.ForwardedRef<HTMLInputElement>
): JSX.Element => {
    const [isChecked, setIsChecked] = useState(initialValue);

    const toggleCheck: () => void = (): void => {
        const newState: boolean = !isChecked;
        setIsChecked(newState);

        if (onChange) {
            const syntheticEvent = {
                target: {
                    name: name,
                    type: "checkbox",
                    value: value,
                    checked: newState,
                },
            } as React.ChangeEvent<HTMLInputElement>;

            onChange(syntheticEvent, false);
        }
    };

    return (
        <div className="flex items-start">
            <div className="flex items-center h-5">
                <input
                    id={id}
                    type="checkbox"
                    disabled={disabled}
                    checked={isChecked}
                    className="w-4 h-4 border border-gray-300 rounded-sm bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
                    ref={ref}
                    value={value}
                    name={name}
                    onChange={toggleCheck}
                />
            </div>

            <div className="ms-3">
                <label
                    htmlFor={id}
                    className="mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
                >
                    {label}
                    {isRequired && t && <RequiredAsterisk t={t}/>}
                    {tipText && <TooltipIcon tipText={tipText}/>}
                </label>

                <FormError error={error}/>
            </div>
        </div>
    );
};

export const Checkbox = React.forwardRef(CheckboxInner);
