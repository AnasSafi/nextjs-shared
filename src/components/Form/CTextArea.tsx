"use client";

import React, {
    forwardRef,
    InputHTMLAttributes,
    useState,
} from "react";
import type {LanguageConfig} from "../../i18n/languageConfigUtils";
import {isLanguageRTL} from "../../i18n/languageConfigUtils";
import type {RHFErrorInput} from "../../models/core/formModels";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {isLocaleObject} from "../../utils/localizationUtils";

interface TextAreaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
    isRequired?: boolean;
    toggleLocale?: () => void;
    formLocale?: string;
    initValue?: string | number | readonly string[] | undefined | object;
    name: string;
    id?: string;
    placeholder?: string;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    alwaysLTR?: boolean;
    error?: RHFErrorInput;
    label?: string;
    rows?: number;

    // translation injection (for required tooltip only)
    t?: (key: string) => string;

    // language config injection (for RTL fallback)
    languages?: LanguageConfig[];
}

const toStr = (v: unknown): string => (v ?? "").toString();

const buildInitialValuesByLocale = (
    initValue: TextAreaProps["initValue"],
    formLocale?: string,
): Record<string, string> => {
    const map: Record<string, string> = {};

    if (isLocaleObject(initValue)) {
        Object.entries(initValue as Record<string, unknown>).forEach(
            ([loc, val]) => {
                map[loc] = toStr(val);
            },
        );
    } else if (initValue !== undefined && initValue !== null) {
        const key = formLocale ?? "default";
        map[key] = toStr(initValue);
    }

    return map;
};

const firstNonSpace = (s: string): string | undefined => {
    for (const ch of s) {
        if (!/\s/.test(ch)) return ch;
    }
    return undefined;
};

const computeDir = (
    value: string,
    formLocale?: string,
    alwaysLTR?: boolean,
    languages?: LanguageConfig[],
): "ltr" | "rtl" => {
    if (alwaysLTR) return "ltr";

    const ch = firstNonSpace(value);
    if (ch) {
        if (/[A-Za-z0-9]/.test(ch)) return "ltr";
        if (/[\u0590-\u05FF\u0600-\u06FF]/.test(ch)) return "rtl";
    }

    if (languages && formLocale && isLanguageRTL(languages, formLocale)) return "rtl";
    return "ltr";
};

const CTextAreaInner = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    (
        {
            isRequired = false,
            toggleLocale,
            formLocale,
            initValue,
            description,
            tipText,
            alwaysLTR = false,
            name,
            id,
            placeholder,
            className,
            error,
            label,
            disabled,
            rows = 7,
            t,
            languages,
            // external value is ignored, we manage internal state per locale
            value: _ignoredValue,
            onChange,
            ...props
        },
        ref,
    ) => {
        const currentLocale = formLocale ?? "default";

        const [valuesByLocale, setValuesByLocale] = useState<Record<string, string>>(
            () => buildInitialValuesByLocale(initValue, formLocale),
        );

        const value = valuesByLocale[currentLocale] ?? "";
        const dir = computeDir(value, formLocale, alwaysLTR, languages);

        const textAreaClassName =
            `bg-gray-50 dark:bg-gray-700 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg ` +
            `focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 ` +
            `dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-gray-500 ${className ?? ""}`;

        const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = event.target.value;

            setValuesByLocale((prev) => ({
                ...prev,
                [currentLocale]: newValue,
            }));

            if (onChange) {
                onChange(event);
            }
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
                            {toggleLocale && (
                                <span
                                    onClick={() => toggleLocale()}
                                    className="ml-2 text-primary-600 cursor-pointer rounded-full bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase"
                                >
                                    {formLocale}
                                </span>
                            )}
                        </label>
                    )}
                    <div className="relative">
                        <textarea
                            dir={dir}
                            ref={ref}
                            name={name}
                            id={id}
                            placeholder={placeholder}
                            className={textAreaClassName}
                            disabled={disabled}
                            value={value}
                            onChange={handleChange}
                            rows={rows}
                            {...props}
                        />
                    </div>
                    {description && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                            {description}
                        </p>
                    )}
                    <FormError error={error}/>
                </>
            </div>
        );
    },
);

CTextAreaInner.displayName = "CTextArea";

export const CTextArea = CTextAreaInner;
