"use client";
import React from "react";
import {TranslateFn} from "../../models/core/localeModels";

export type RequiredAsteriskProps = {
    t: TranslateFn;
    className?: string;
    titleKey?: string;
};

export function RequiredAsterisk(props: RequiredAsteriskProps): React.ReactElement {
    const {t, className, titleKey = "requiredField"} = props;
    return <span title={t(titleKey)} className={className ?? "text-red-600 ms-1"}>*</span>;
}
