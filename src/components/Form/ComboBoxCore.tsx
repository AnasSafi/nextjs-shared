"use client";

import React, {forwardRef, type JSX} from "react";
import type {FieldValues} from "react-hook-form";
import type {
    PaginationModel,
    SelectOptionModel,
} from "../../models/core/dbModels";
import BaseComboBoxCore, {
    type BaseComboBoxInjected,
} from "./BaseComboBoxCore";
import {RHFErrorCompat} from "../../models/core/formModels";
import CircleLoader from "../Loader/CircleLoader";

export interface ComboBoxCoreProps<
    TFormValues extends FieldValues = FieldValues
> {
    setParentInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
    isRequired?: boolean;
    initValue?: SelectOptionModel | null;
    name: string;
    type?: string;
    id?: string;
    placeholder?: string | null;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    error?: RHFErrorCompat<TFormValues>;
    label?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    pagination?: PaginationModel | null;
    imageForSelectedOnly?: boolean;
    refreshCompoList?: (
        administrativeDivisionIs: string,
        newChildValue: string
    ) => void;
    dropdownStrategy?: "inline" | "fixed";

    createApiPath?: string;
    createActionLabel?: string;
    createMapSuccessToOption?: (serverData: unknown) => SelectOptionModel;
    createExtraBody?: Record<string, unknown>;

    showAllLanguagesInOptions?: boolean;

    canEditOptions?: boolean;
    canDeleteOptions?: boolean;
    updateApiPath?: string | ((opt: SelectOptionModel) => string);
    deleteApiPath?: string | ((opt: SelectOptionModel) => string);

    buildUpdateBody?: (
        prev: SelectOptionModel,
        localizedTwoChar: Record<string, string>
    ) => unknown;

    updateMapSuccessToOption?: (
        serverData: unknown,
        prev: SelectOptionModel
    ) => SelectOptionModel;

    buildDeleteBody?: (opt: SelectOptionModel) => unknown;
    confirmDeleteMessage?: string;
}

function ComboBoxCoreInner<
    TFormValues extends FieldValues = FieldValues
>(
    props: ComboBoxCoreProps<TFormValues> &
        BaseComboBoxInjected,
    ref: React.ForwardedRef<HTMLInputElement>
): JSX.Element {
    const {initValue, ...rest} = props;

    const baseProps = {
        ...rest,
        variant: "single" as const,
        initValueSingle: initValue,
        LoaderSlot: <CircleLoader sizePx={24} />,
    };

    return <BaseComboBoxCore {...baseProps} ref={ref} />;
}

export const ComboBoxCore = forwardRef(ComboBoxCoreInner) as <
    TFormValues extends FieldValues = FieldValues
>(
    props: ComboBoxCoreProps<TFormValues> &
        BaseComboBoxInjected & {
        ref?: React.ForwardedRef<HTMLInputElement>;
    },
) => JSX.Element;

export default ComboBoxCore;
