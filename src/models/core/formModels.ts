import type React from "react";
import type {FieldError, FieldErrors, FieldErrorsImpl, FieldValues} from "react-hook-form";
import type {ObjectSchema} from "yup";
import type {MultiLangValue} from "./localeModels";
import type {MediaFileViewModel} from "./mediaModels";

/* ----------------------------- RHF Error Types ---------------------------- */
export type RHFArrayFieldError = Partial<FieldError> & {
    [x: number]: FieldError | undefined;
};

export type RHFFieldError<T extends FieldValues = FieldValues> =
    | FieldError
    | (Partial<FieldError> & FieldErrorsImpl<T>)
    | RHFArrayFieldError;

export type RHFErrorInput<T extends FieldValues = FieldValues> =
    | RHFFieldError<T>
    | FieldErrors<T>
    | undefined;

/* RHF error compat */
export type RHFArrayErrorCompat = Partial<FieldError> & {
    [x: number]: FieldError | undefined;
};

export type RHFErrorCompat<T extends FieldValues = FieldValues> =
    | RHFErrorInput<T>
    | RHFArrayErrorCompat;

/* ----------------------------- Server Responses --------------------------- */

export interface ServerErrorModel {
    error: {
        status?: number;
        redirect?: {
            path: string;
        };
        title?: string;
        message?: string;
        validationErrors?: {
            [key: string]: {
                message: string;
                type: string;
                value: unknown;
            };
        };
    };
}

export interface ServerSuccessModel<T> {
    success: {
        redirect?: {
            path: string;
        };
        newToken?: string;
        title?: string;
        message?: string;
        data?: T;
        userAuth?: {
            token: string;
            refreshToken?: string;
        };
    };
}

export function successResponse<T>({
    data,
    options = {
        redirect: undefined,
        newToken: undefined,
        title: undefined,
        message: undefined,
        userAuth: undefined,
    },
}: {
    data?: T;
    options?: {
        redirect?: { path: string };
        newToken?: string;
        title?: string;
        message?: string;
        userAuth?: { token: string; refreshToken?: string };
    };
}): ServerSuccessModel<T> {
    return {
        success: {
            ...options,
            data,
        },
    };
}

export function errorResponse({
    title = "Error",
    message = "An error occurred.",
    validationErrors,
}: {
    redirect?: { path: string };
    title?: string;
    message?: string;
    validationErrors?: {
        [key: string]: {
            message: string;
            type: string;
            value: unknown;
        };
    };
}): ServerErrorModel {
    const response: ServerErrorModel = {
        error: {
            title,
            message,
        },
    };
    if (validationErrors) {
        response.error.validationErrors = validationErrors;
    }
    return response;
}

/* -------------------------- Filter Form Handler Props --------------------- */
export interface UseFilterFormHandlerProps<TValues extends FieldValues = FieldValues> {
    validationSchema: ObjectSchema<TValues>;
    bodyData: TValues;
    parseToFilterModel: () => void;
    modalId?: string;
}

/* ---------------------------------- Files -------------------------------- */
export interface FileState {
    key: string;
    file?: File;
    mediaFile?: MediaFileViewModel;
    uploadProgress?: number;
    uploadSuccess?: boolean;
    failedReason?: string;
    mediaId?: string;
}

export type SaveCreateOptionRequest = {
    name: MultiLangValue;
};

/* --------------------------------- Forms --------------------------------- */
export interface FormPropsModel<TData = unknown, TClose = unknown> {
    modalId?: string;
    data?: TData;
    closeModalWithData: (value: TClose) => void;
}

export interface RegularFormPropsModel<TData = unknown> {
    modalId?: string;
    data?: TData;
    onReset?: () => void;
}

export interface FormRefModel {
    submitForm: () => void;
    hasUnsavedChanges?: () => boolean;
}
