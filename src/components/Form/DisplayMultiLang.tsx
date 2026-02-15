"use client";

import React from "react";
import {MultiLangValue, TranslateFn} from "../../models/core/localeModels";

export type DisplayMultiLangProps = {
    multiLangValue: MultiLangValue | null;
    t?: TranslateFn;
    getLangLabel?: (lang: string) => string;
    emptyText?: string;
    className?: string;
};

export function DisplayMultiLang(props: DisplayMultiLangProps): React.ReactElement {
    const {multiLangValue, t, getLangLabel, emptyText = "No data available", className} = props;

    if (!multiLangValue || Object.keys(multiLangValue).length === 0) {
        return <div className={className}>{emptyText}</div>;
    }

    const labelOf = (lang: string): string => {
        if (getLangLabel) return getLangLabel(lang);
        if (t) return t(lang);
        return lang;
    };

    return (
        <div className={className}>
            {Object.entries(multiLangValue).map(([lang, value]) =>
                value ? (
                    <div key={lang}>
                        <strong>{labelOf(lang)}:</strong> {value}
                    </div>
                ) : null
            )}
        </div>
    );
}
