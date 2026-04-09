"use client";

import React, {forwardRef, InputHTMLAttributes, JSX, useEffect, useMemo, useState} from "react";
import type {FieldError, DeepMap} from "react-hook-form";
import {FormError} from "./Helpers/FormError";
import {
    createSyntheticInputChangeEvent,
    createSyntheticInputFocusEvent,
    FieldHeader,
    baseInputClasses,
    formatISO,
    patchFormElementChangeEventValue,
    patchFormElementFocusEventValue,
} from "./Helpers/fieldShared";
import {TranslateFn} from "../../models/core/localeModels";
import {
    type DateInputDisplayMode,
    type DatePart,
    SegmentedDatePartsInput,
} from "./Helpers/dateDisplayModeShared";
import {ReactAriaDateFieldInput} from "./Helpers/dateReactAriaShared";

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
    displayMode?: DateInputDisplayMode;
    partOrder?: DatePart[];
    yearRange?: {start: number; end: number};
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
            displayMode = "native",
            partOrder,
            yearRange,
            onChange,
            onBlur,
            t,
            ...props
        }: DateInputProps,
        ref: React.ForwardedRef<HTMLInputElement>
    ): JSX.Element => {
        const inputClassName: string = baseInputClasses(className);
        const formattedInitValue = useMemo<string>(() => formatISO(initValue), [initValue]);
        const controlledValue = typeof props.value === "string" ? props.value : undefined;
        const defaultValueFromProps = typeof props.defaultValue === "string"
            ? props.defaultValue
            : undefined;
        const [segmentedValue, setSegmentedValue] = useState<string>(
            controlledValue ?? defaultValueFromProps ?? formattedInitValue,
        );

        useEffect(() => {
            if (displayMode === "native") return;

            if (controlledValue !== undefined) {
                setSegmentedValue(controlledValue);
                return;
            }

            setSegmentedValue(defaultValueFromProps ?? formattedInitValue);
        }, [displayMode, controlledValue, defaultValueFromProps, formattedInitValue]);

        const handleSegmentedChange = (
            nextValue: string,
            event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
        ): void => {
            setSegmentedValue(nextValue);
            if (!onChange) return;

            onChange(
                patchFormElementChangeEventValue(event, nextValue, {name}),
            );
        };

        const handleSegmentedBlur = (
            nextValue: string,
            event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
        ): void => {
            if (!onBlur) return;
            onBlur(
                patchFormElementFocusEventValue(event, nextValue, {name}),
            );
        };

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
                    {displayMode === "native" ? (
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
                            onChange={onChange}
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
                                kind="date"
                                value={segmentedValue}
                                onValueChange={(nextValue) => {
                                    setSegmentedValue(nextValue);
                                    if (!onChange) return;
                                    onChange(createSyntheticInputChangeEvent(name, nextValue));
                                }}
                                onValueBlur={(nextValue) => {
                                    if (!onBlur) return;
                                    onBlur(createSyntheticInputFocusEvent(name, nextValue));
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
                                kind="date"
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

CDateInput.displayName = "CDateInput";
