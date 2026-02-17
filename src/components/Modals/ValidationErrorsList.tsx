"use client";

import React, {memo} from "react";
import clsx from "clsx";
import {ExclamationTriangleIcon} from "@heroicons/react/24/outline";

export type ValidationErrorItem = {
    field?: string;
    message: string;
};

type Props = {
    items: ValidationErrorItem[];
    className?: string;
    t: (key: string) => string;
};

const ValidationErrorsList = memo(function ValidationErrorsList({items, className, t}: Props) {
    if (!items || items.length === 0) return null;

    return (
        <div
            className={clsx(
                "mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100",
                className,
            )}
            role="alert"
            aria-live="polite"
        >
            <div className="mb-2 flex items-start gap-2">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="font-semibold">
                    {t("pleaseFixTheFollowing")}
                </div>
            </div>

            <ul className="list-disc space-y-1 ps-5">
                {items.map((it, idx) => (
                    <li key={`${it.field ?? "field"}-${idx}`}>
                        {it.field ? (
                            <span className="me-1 font-medium">
                                <span className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">
                                    {t(it.field)}
                                </span>
                                <span className="mx-1">—</span>
                            </span>
                        ) : null}
                        <span>{it.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
});

export default ValidationErrorsList;