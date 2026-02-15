"use client";

import React from "react";
import {ShieldErrorIcon} from "../Icons/ShieldErrorIcon";
import {TranslateFn} from "../../models/core/localeModels";

export type Error403Props = {
    t: TranslateFn;
    titleKey?: string;
    messageKey?: string;
    className?: string;
};

export function Error403(props: Error403Props): React.ReactElement {
    const {t, titleKey, messageKey, className} = props;

    const resolvedTitleKey = titleKey ?? "403Forbidden";
    const resolvedMessageKey = messageKey ?? "youAreNotAuthorizedMessage";

    return (
        <div className={`min-h-full flex items-center justify-center bg-gray-200 dark:bg-gray-900 rounded-xs ${className ?? ""}`}>
            <div className="p-8 rounded-sm shadow-lg max-w-md">
                <ShieldErrorIcon className="mx-auto mb-4 text-red-500 w-16 h-16" />
                <h1 className="text-2xl font-bold text-red-500 mb-4">{t(resolvedTitleKey)}</h1>
                <p className="text-gray-700 dark:text-gray-100">{t(resolvedMessageKey)}</p>
            </div>
        </div>
    );
}
