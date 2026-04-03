"use client";

import React, {useEffect, useRef, useState} from "react";
import type {ChangeEvent, JSX} from "react";

import type {TranslateFn} from "../../models/core/localeModels";
import {isLanguageRTL} from "../../i18n/languageConfigUtils";
import {isLocaleObject} from "../../utils/localizationUtils";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {FormError} from "./Helpers/FormError";
import {MarkdownTextAreaProps} from "../../models/markdown/markdownModels";

export type MarkdownTextAreaDeps = {
    useTranslationHook: () => { t: TranslateFn };

    MarkdownTextView: (props: { text: string }) => JSX.Element | null;

    MarkdownControls: (props: {
        markdownGroups?: Array<{
            name: string;
            items: Array<{ name: string }>;
        }>;
        textareaRef: React.RefObject<HTMLTextAreaElement | null>;
        setValue: (value: string) => void;
        currentLang?: string;
    }) => JSX.Element;
};

const toStr = (v: unknown): string => (v ?? "").toString();

const buildInitialValuesByLocale = (
    initValue: unknown,
    currentLocale: string,
): Record<string, string> => {
    if (isLocaleObject(initValue)) {
        const mapped: Record<string, string> = {};
        Object.entries(initValue as Record<string, unknown>).forEach(
            ([loc, val]) => {
                mapped[loc] = toStr(val);
            },
        );
        return mapped;
    }

    return {[currentLocale]: toStr(initValue)};
};

const mergeValuesByLocaleIfChanged = (
    prev: Record<string, string>,
    patch: Record<string, string>,
): Record<string, string> => {
    let changed = false;
    const next = {...prev};

    Object.entries(patch).forEach(([loc, val]) => {
        if (next[loc] !== val) {
            next[loc] = val;
            changed = true;
        }
    });

    return changed ? next : prev;
};

const serializeInitValue = (initValue: unknown): string => {
    if (isLocaleObject(initValue)) {
        const normalized = Object.entries(initValue as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([loc, val]) => [loc, toStr(val)]);
        return JSON.stringify(normalized);
    }
    return JSON.stringify(initValue ?? null);
};

const firstNonSpace = (s: string): string | undefined => {
    for (const ch of s) {
        if (!/\s/.test(ch)) return ch;
    }
    return undefined;
};

const computeDir = (
    value: string,
    currentLocale: string,
    alwaysLTR: boolean,
): "ltr" | "rtl" => {
    if (alwaysLTR) return "ltr";

    const ch = firstNonSpace(value);
    if (ch) {
        if (/[A-Za-z0-9]/.test(ch)) return "ltr";
        if (/[\u0590-\u05FF\u0600-\u06FF]/.test(ch)) return "rtl";
    }

    return isLanguageRTL(currentLocale) ? "rtl" : "ltr";
};

const createSyntheticTextAreaChangeEvent = (
    name: string,
    value: string,
): ChangeEvent<HTMLTextAreaElement> => {
    return {
        target: {
            name,
            type: "textarea",
            value,
        },
        currentTarget: {
            name,
            type: "textarea",
            value,
        },
    } as unknown as ChangeEvent<HTMLTextAreaElement>;
};

export function createMarkdownTextArea(deps: MarkdownTextAreaDeps) {
    const {useTranslationHook, MarkdownTextView, MarkdownControls} = deps;

    return function MarkdownTextArea(
        props: MarkdownTextAreaProps,
    ): JSX.Element {
        const {
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
            handleInputChange,
            markdownGroups,
            rows = 7,
            value: _ignoreValue,
            onChange,
            ...rest
        } = props;

        const {t} = useTranslationHook();
        const currentLocale = formLocale ?? "default";
        const inputId = id ?? name;

        const [valuesByLocale, setValuesByLocale] = useState<Record<string, string>>(
            () => buildInitialValuesByLocale(initValue, currentLocale),
        );
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const lastAppliedInitRef = useRef<string>(serializeInitValue(initValue));

        const value = valuesByLocale[currentLocale] ?? "";
        const dir = computeDir(value, currentLocale, alwaysLTR);

        const textAreaClassName =
            `bg-gray-50 dark:bg-gray-700 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg ` +
            `focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 ` +
            `dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-gray-500 ${className ?? ""}`;

        useEffect(() => {
            const snapshot = serializeInitValue(initValue);
            if (snapshot === lastAppliedInitRef.current) return;
            lastAppliedInitRef.current = snapshot;

            const patch = buildInitialValuesByLocale(initValue, currentLocale);
            setValuesByLocale((prev) => mergeValuesByLocaleIfChanged(prev, patch));
        }, [initValue, currentLocale]);

        const notifyChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
            handleInputChange?.(event);
            onChange?.(event);
        };

        const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = event.target.value;
            if (newValue === value) return;

            setValuesByLocale((prev) => {
                const prevValue = prev[currentLocale] ?? "";
                if (prevValue === newValue) return prev;
                return {...prev, [currentLocale]: newValue};
            });
            notifyChange(event);
        };

        const handleMarkdownControlSetValue = (nextValue: string): void => {
            if (nextValue === value) return;

            setValuesByLocale((prev) => {
                const prevValue = prev[currentLocale] ?? "";
                if (prevValue === nextValue) return prev;
                return {...prev, [currentLocale]: nextValue};
            });

            const syntheticEvent = createSyntheticTextAreaChangeEvent(name, nextValue);
            notifyChange(syntheticEvent);
        };

        return (
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="w-full lg:w-1/2">
                    {label && (
                        <label
                            htmlFor={inputId}
                            className=" mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
                        >
                            <div>
                                {label}
                                {isRequired && <RequiredAsterisk t={t}/>}
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
                        <MarkdownControls
                            markdownGroups={markdownGroups}
                            textareaRef={textareaRef}
                            setValue={handleMarkdownControlSetValue}
                            currentLang={currentLocale}
                        />

                        <textarea
                            {...rest}
                            dir={dir}
                            name={name}
                            id={inputId}
                            placeholder={placeholder}
                            className={textAreaClassName}
                            disabled={disabled}
                            value={value}
                            ref={textareaRef}
                            onChange={handleChange}
                            rows={rows}
                            aria-invalid={!!error}
                            aria-describedby={error ? `${inputId}-error` : undefined}
                        />
                    </div>

                    {description && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
                    )}
                    <FormError error={error}/>
                </div>

                <div className="w-full lg:w-1/2">
                    <div className="mb-1">{t("textPreview")}:</div>
                    <div
                        className="max-h-96 bg-gray-50 dark:bg-gray-800 rounded-md p-2 overflow-y-auto border min-h-10">
                        {value.length > 0 && <MarkdownTextView text={value}/>}
                    </div>
                </div>
            </div>
        );
    };
}
