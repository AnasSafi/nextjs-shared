import React from "react";
import { TooltipIcon } from "../TooltipIcon";
import {RequiredAsterisk} from "../RequiredAsterisk";

export const baseInputClasses = (extra?: string) =>
    [
        "bg-gray-50",
        "placeholder:text-xs",
        "border",
        "border-gray-300",
        "text-gray-900",
        "sm:text-sm",
        "rounded-lg",
        "focus:ring-primary-600",
        "focus:border-primary-600",
        "block",
        "w-full",
        "p-2.5",
        "dark:bg-gray-700",
        "dark:border-gray-600",
        "dark:placeholder-gray-400",
        "dark:text-white",
        "dark:focus:ring-blue-500",
        "dark:focus:border-gray-500",
        extra ?? "",
    ].join(" ");

export interface FieldHeaderProps {
    id?: string;
    label?: string;
    tipText?: string;
    isRequired?: boolean;
    rightBadgeText?: string;
    onRightBadgeClick?: () => void;
    t?: (key: string) => string;
    requiredTitleKey?: string;
}

export function FieldHeader({
    id,
    label,
    tipText,
    isRequired,
    rightBadgeText,
    onRightBadgeClick,
    t,
    requiredTitleKey,
}: FieldHeaderProps) {
    if (!label) return null;

    return (
        <label
            htmlFor={id}
            className="mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                {isRequired && t && <RequiredAsterisk t={t} titleKey={requiredTitleKey} />}
                {tipText && <TooltipIcon tipText={tipText} />}
            </div>

            {rightBadgeText && onRightBadgeClick && (
                <span
                    onClick={onRightBadgeClick}
                    className="ml-2 text-primary-600 cursor-pointer rounded-full bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase"
                >
                    {rightBadgeText}
                </span>
            )}
        </label>
    );
}

export function formatISODate(d?: Date | string | null): string {
    if (!d) return "";
    const dateObj = d instanceof Date ? d : new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
}

export function formatDateTimeLocal(input?: Date | string | null): string {
    if (!input) return "";
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function coerceToDateTimeLocalString(input?: Date | string | null): string {
    if (!input) return "";
    if (input instanceof Date) {
        return formatDateTimeLocal(input);
    }
    const candidate: string = input.includes("T") ? input : input.replace(" ", "T");
    return formatDateTimeLocal(candidate);
}

export const formatISO = (d?: Date | string | null) => {
    if (!d) return "";
    const dateObj: Date = d instanceof Date ? d : new Date(d);
    return isNaN(dateObj.getTime()) ? "" : dateObj.toISOString().slice(0, 10);
};
