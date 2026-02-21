import * as yup from "yup";
import type {Schema} from "yup";
import type {NextRequest} from "next/server";
import {createTranslationInputName} from "../utils/translationUtils";
import {ConsoleUtils} from "../utils/consoleUtils";
import type {TranslateFn} from "../models/core/localeModels";
import {ServerResponse} from "./ServerResponse";
import {errorResponse} from "../models/core/formModels";

export interface ValidationFieldError {
    message: string;
    type?: string;
    value?: unknown;
}

type ErrorResponseValidationErrors = Record<
    string,
    {
        message: string;
        type: string;
        value: unknown;
    }
>;

export type ValidationErrorsMap = Record<string, ValidationFieldError>;

export type GetTranslations = () => Promise<{t: TranslateFn}>;

export function createHandlePostRequest(args: {
    getTranslations: GetTranslations;
    HttpErrorClass: new (...args: any[]) => Error & {status: number; code?: string};
}) {
    const {getTranslations, HttpErrorClass} = args;

    const handleValidationErrors = (
        validationError: yup.ValidationError,
    ): ErrorResponseValidationErrors => {
        const out: ErrorResponseValidationErrors = {};
        for (const err of [...validationError.inner].reverse()) {
            const path = err.path;
            if (typeof path === "string") {
                out[path] = {
                    message: err.message,
                    type: err.type ?? "validation",
                    value: err.value as unknown,
                };
            }
        }
        return out;
    };

    const handleErrorResponse = async (
        errorMessage: string,
        statusCode: number,
    ): Promise<ServerResponse> => {
        const {t} = await getTranslations();
        ConsoleUtils.error(errorMessage);

        return new ServerResponse(
            errorResponse({
                title: t("serverError"),
                message: t("serverErrorMessageWithoutCode"),
            }),
            statusCode,
        );
    };

    return async function handlePostRequest<TData>(
        request: NextRequest,
        data: TData,
        validationSchema: Schema<TData>,
        callback: (request: NextRequest, data: TData) => Promise<ServerResponse>,
    ): Promise<ServerResponse> {
        const {t} = await getTranslations();

        try {
            await validationSchema.validate(data, {
                context: {t, translateFieldName: createTranslationInputName(t)},
                abortEarly: false,
            });

            return await callback(request, data);
        } catch (error: unknown) {
            if (error instanceof yup.ValidationError) {
                const validationErrors = handleValidationErrors(error);
                return new ServerResponse(
                    errorResponse({
                        title: t("formSubmissionError"),
                        message: t("formSubmissionErrorMessage"),
                        validationErrors,
                    }),
                    400,
                );
            }

            if (error instanceof HttpErrorClass) {
                const message = error.code ? t(error.code) : error.message;
                return new ServerResponse(
                    errorResponse({
                        title: t("error"),
                        message,
                    }),
                    error.status,
                );
            }

            const fallbackMessage =
                (error as Error | undefined)?.message ?? "Internal Server Error";
            return handleErrorResponse(fallbackMessage, 500);
        }
    };
}