"use client";

import React from "react";
import {MultiLangValue, TranslateFn} from "../../models/core/localeModels";

export type DisplayMultiLangVariant = "list" | "inline" | "badges";

export type DisplayMultiLangProps = {
    multiLangValue: MultiLangValue | null;
    t?: TranslateFn;
    getLangLabel?: (lang: string) => string;
    emptyText?: string;
    name?: string;
    label?: string;
    variant?: DisplayMultiLangVariant;
    className?: string;
};

export function DisplayMultiLang(props: DisplayMultiLangProps): React.ReactElement {
    const {
        multiLangValue,
        t,
        getLangLabel,
        emptyText = "No data available",
        name,
        label,
        variant = "list",
        className,
    } = props;

    const labelOf = (lang: string): string => {
        if (getLangLabel) return getLangLabel(lang);
        if (t) return t(lang);
        return lang;
    };

    const fieldTitle: string | undefined = label ?? name;
    const entries = Object.entries(multiLangValue ?? {}).filter(([, value]) =>
        typeof value === "string" && value.trim().length > 0
    );

    const rootClassName = ["space-y-2", className].filter(Boolean).join(" ");

    const renderContent = (): React.ReactElement => {
        if (entries.length === 0) {
            return <div className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</div>;
        }

        if (variant === "inline") {
            return (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                    {entries.map(([lang, value], index) => (
                        <React.Fragment key={lang}>
                            <span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{labelOf(lang)}:</span>{" "}
                                {value}
                            </span>
                            {index < entries.length - 1 && <span className="text-gray-400 dark:text-gray-500">|</span>}
                        </React.Fragment>
                    ))}
                </div>
            );
        }

        if (variant === "badges") {
            return (
                <div className="flex flex-wrap gap-2">
                    {entries.map(([lang, value]) => (
                        <div
                            key={lang}
                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {labelOf(lang)}
                            </div>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{value}</div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="space-y-1">
                {entries.map(([lang, value]) => (
                    <div key={lang} className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{labelOf(lang)}:</span>{" "}
                        {value}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={rootClassName}>
            {fieldTitle && <div className="text-sm font-medium text-gray-900 dark:text-white">{fieldTitle}</div>}
            {renderContent()}
        </div>
    );
}
