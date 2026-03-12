import type React from "react";
import type {ReactNode} from "react";
import type {FieldErrors, FieldValues, UseFormRegister} from "react-hook-form";
import type {FormPropsModel, RegularFormPropsModel} from "../core/formModels";

export enum DialogType {
    Info = "info",
    Warning = "warning",
    Error = "error",
    Alert = "alert",
    Success = "success",
}

export interface OptionalModalTemplateProps {
    dialogType?: DialogType;
    dialogTitle?: string;
    dialogMessage?: string;
    dialogMaxWidthClass?: string;
    fullHeightScreen?: boolean;
    showIcon?: boolean;
    withMinHeight?: boolean;

    preventCloseOutside?: boolean;
    onCloseModal?: () => void;

    acceptButtonText?: string | null;
    acceptButtonOnClick?: (() => void) | null;

    button1Text?: string;
    button1OnClick?: (() => void) | null;

    button2Text?: string;
    button2OnClick?: (() => void) | null;

    cancelButtonText?: string;
    cancelButtonOnClick?: (() => void) | null;

    showCancelButton?: boolean;
    hasUnsavedChanges?: (() => boolean) | null;
    unsavedChangesTitle?: string;
    unsavedChangesMessage?: string;
    unsavedChangesCloseButtonText?: string;
    unsavedChangesCancelButtonText?: string;
}

export interface ModalTemplateProps {
    id: string;
    children: ReactNode;
    t: (key: string) => string;
}

export interface ModalModel {
    content: ReactNode;
    config?: OptionalModalTemplateProps;
    isOpen: boolean;
    inProgressModal?: boolean;
}

export interface ModalStateModel {
    modals: Record<string, ModalModel>;
    openModal: (id: string, content: ReactNode, config?: OptionalModalTemplateProps) => void;
    closeModal: (id: string) => void;
    setModalInProgress: (id: string, value: boolean) => void;
}

export type UseFormFunctionModel<T extends FieldValues, TIn = unknown, TClose = unknown> = (
    setProgress: React.Dispatch<React.SetStateAction<boolean>>,
    props: FormPropsModel<TIn, TClose>,
    data: T,
    closeModalWithData: (value: TClose) => void
) => {
    register: UseFormRegister<T>;
    errors: FieldErrors<T>;
    onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
    requiredFields: (keyof T)[];
};

export type UseRegularFormFunction<T extends FieldValues> = (
    setProgress: React.Dispatch<React.SetStateAction<boolean>>,
    props: RegularFormPropsModel,
    data: T,
) => {
    register: UseFormRegister<T>;
    errors: FieldErrors<T>;
    onSubmit: (e?: React.BaseSyntheticEvent) => void;
    requiredFields: (keyof T)[];
};

export interface LoaderStateModel {
    isLoading: boolean;
    setLoading: (value: boolean) => void;
}
