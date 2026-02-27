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
            onChange: _ignoreOnChange,
            ...rest
        } = props;

        const {t} = useTranslationHook();
        const currentLocale = formLocale ?? "default";
        const inputId = id ?? name;

        const [dir, setDir] = useState<"ltr" | "rtl">(
            formLocale ? (isLanguageRTL(formLocale) ? "rtl" : "ltr") : "ltr",
        );
        const [value, setValue] = useState<string>("");
        const [valuesByLocale, setValuesByLocale] = useState<Record<string, string>>({});
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        const skipEffectNotifyRef = useRef(false);
        const prevInitSnapshotRef = useRef<string>("");

        const textAreaClassName =
            `bg-gray-50 dark:bg-gray-700 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg ` +
            `focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 ` +
            `dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-gray-500 ${className ?? ""}`;

        const toStr = (v: unknown): string => (v ?? "").toString();

        useEffect(() => {
            const snapshot = JSON.stringify(initValue ?? null);
            if (snapshot === prevInitSnapshotRef.current) return;
            prevInitSnapshotRef.current = snapshot;

            setValuesByLocale((prev) => {
                const next = {...prev};

                if (isLocaleObject(initValue)) {
                    Object.entries(initValue as Record<string, unknown>).forEach(([loc, val]) => {
                        next[loc] = toStr(val);
                    });
                } else if (initValue !== undefined && initValue !== null) {
                    next[currentLocale] = toStr(initValue);
                }

                const nextVal = next[currentLocale] ?? "";
                setValue(nextVal);
                return next;
            });
        }, [initValue, currentLocale]);

        useEffect(() => {
            setValue(valuesByLocale[currentLocale] ?? "");
            if (alwaysLTR) setDir("ltr");
            else setDir(isLanguageRTL(currentLocale) ? "rtl" : "ltr");
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [currentLocale]);

        const firstNonSpace = (s: string): string | undefined => {
            for (const ch of s) {
                if (!/\s/.test(ch)) return ch;
            }
            return undefined;
        };

        const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (alwaysLTR) {
                setDir("ltr");
                return;
            }
            const v = event.currentTarget.value;
            const ch = firstNonSpace(v);
            if (!ch) return;

            if (/[A-Za-z0-9]/.test(ch)) setDir("ltr");
            else if (/[\u0590-\u05FF\u0600-\u06FF]/.test(ch)) setDir("rtl");
        };

        const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
            const newValue = event.target.value;
            skipEffectNotifyRef.current = true;
            setValue(newValue);
            setValuesByLocale((prev) => ({...prev, [currentLocale]: newValue}));
            handleInputChange?.(event);
        };

        useEffect(() => {
            if (!handleInputChange) return;
            if (skipEffectNotifyRef.current) {
                skipEffectNotifyRef.current = false;
                return;
            }
            const syntheticEvent = {
                target: {
                    name,
                    type: "textarea",
                    value,
                },
            } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [value]);

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
                            setValue={setValue}
                            currentLang={currentLocale}
                        />

                        <textarea
                            {...rest}
                            dir={alwaysLTR ? "ltr" : value.length ? dir : undefined}
                            onKeyUp={handleKeyUp}
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