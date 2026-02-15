"use client";

import React from "react";
import {ExclamationCircleIcon} from "@heroicons/react/24/outline";
import {TranslateFn} from "../../models/core/localeModels";

export type ErrorAlertProps = {
    titleKey?: string;
    messageKey?: string;
    t: TranslateFn;
    className?: string;
};

export function ErrorAlert(props: ErrorAlertProps): React.ReactElement {

    const {titleKey, messageKey, t, className} = props;

    return (
        <div
            className={`min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg ${className ?? ""}`}>
            <div className="p-8 m-4 rounded-sm shadow-lg max-w-md bg-gray-100 dark:bg-gray-800">
                <div className="flex justify-center items-center">
                    <ExclamationCircleIcon className="h-10 w-10 text-red-500" aria-hidden="true"/>
                </div>

                {titleKey && (
                    <h1 className="text-2xl font-bold text-red-500 mb-4">{t(titleKey)}</h1>
                )}

                {messageKey && (
                    <p className="text-gray-700 dark:text-gray-100">{t(messageKey)}</p>
                )}
            </div>
        </div>
    );
}
