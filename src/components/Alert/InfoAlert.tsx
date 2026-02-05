"use client";

import React from "react";
import {QrCodeIcon} from "@heroicons/react/24/outline";

export type InfoAlertProps = {
    titleKey?: string;
    messageKey?: string;
    t: (key: string) => string;
    className?: string;
};

export function InfoAlert(props: InfoAlertProps): React.ReactElement {
    const {titleKey, messageKey, t, className} = props;

    return (
        <div
            className={`min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl ${className ?? ""}`}>
            <div className="p-8 m-8 rounded-sm shadow-lg max-w-md">
                <div className="flex justify-center items-center">
                    <QrCodeIcon className="h-10 w-10 text-amber-500" aria-hidden="true" />
                </div>

                {titleKey && (
                    <h1 className="text-2xl font-bold text-amber-500 mb-4">{t(titleKey)}</h1>
                )}

                {messageKey && (
                    <p className="text-gray-700 dark:text-gray-100">{t(messageKey)}</p>
                )}
            </div>
        </div>
    );
}
