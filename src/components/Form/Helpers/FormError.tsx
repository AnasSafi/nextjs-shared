import React, {JSX} from "react";
import type {FieldValues} from "react-hook-form";
import type {RHFErrorInput} from "../../../models/core/formModels";

function extractErrorMessage<T extends FieldValues = FieldValues>(
    err: RHFErrorInput<T>
): string | null {
    if (!err) return null;

    if (typeof (err as { message?: unknown }).message === "string") {
        return (err as { message: string }).message;
    }

    if (typeof err === "object") {
        for (const value of Object.values(err)) {
            const msg = extractErrorMessage(value as RHFErrorInput<T>);
            if (msg) return msg;
        }
    }

    return null;
}

export function FormError<T extends FieldValues = FieldValues>(
    {
        error,
        className = "mt-2 text-xs text-red-600",
    }: {
        error: RHFErrorInput<T>;
        className?: string;
    }): JSX.Element {
    const msg = extractErrorMessage(error);
    if (!msg) return <></>;
    return <p className={className}>{msg}</p>;
}
