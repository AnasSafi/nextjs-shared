"use client";

import React, {JSX} from "react";
import {dirIso639v3} from "../../utils/localeUtils";

export type ViewInputProps = {
    label?: string;
    value?: React.ReactNode;
    forceTextLTR?: boolean;
    valueClassName?: string;
    currentLng: string;
};

export default function ViewInput(
    {label, value, forceTextLTR, valueClassName, currentLng}: ViewInputProps,
): JSX.Element {
    const pageDirection: string = dirIso639v3(currentLng);

    const textStyle: React.CSSProperties = forceTextLTR
        ? {direction: "ltr", textAlign: pageDirection === "rtl" ? "right" : "left"}
        : {direction: pageDirection as "ltr" | "rtl", textAlign: "inherit"};

    return (
        <div>
            {label && (
                <label className="text-sm font-medium text-gray-500 dark:text-gray-200 flex justify-between">
                    <div>{label}</div>
                </label>
            )}
            <div className={`relative text-gray-900 dark:text-white ${valueClassName ?? ""}`} style={textStyle}>
                {value}
            </div>
        </div>
    );
}
