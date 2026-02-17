"use client";

import React, {forwardRef, type JSX} from "react";
import type {FieldValues} from "react-hook-form";
import type {
    PaginationModel,
    SelectOptionModel,
} from "../../models/core/dbModels";
import type {RHFErrorCompat} from "../../models/core/formModels";
import BaseComboBoxCore, {
    type BaseComboBoxInjected,
} from "./BaseComboBoxCore";
import CircleLoader from "../Loader/CircleLoader";

export interface MultiSelectComboBoxCoreProps<
    TFormValues extends FieldValues = FieldValues
> {
    setParentInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
    isRequired?: boolean;
    initValue?: SelectOptionModel[];
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

function MultiSelectComboBoxCoreInner<
    TFormValues extends FieldValues = FieldValues
>(
    props: MultiSelectComboBoxCoreProps<TFormValues> &
        BaseComboBoxInjected,
    ref: React.ForwardedRef<HTMLInputElement>,
): JSX.Element {
    const {initValue, ...rest} = props;

    const baseProps = {
        ...rest,
        variant: "multiple" as const,
        initValueMultiple: initValue,
        LoaderSlot: <CircleLoader sizePx={24} />,
    };

    return <BaseComboBoxCore {...baseProps} ref={ref} />;
}

export const MultiSelectComboBoxCore = forwardRef(
    MultiSelectComboBoxCoreInner,
) as <
    TFormValues extends FieldValues = FieldValues
>(
    props: MultiSelectComboBoxCoreProps<TFormValues> &
        BaseComboBoxInjected & {
        ref?: React.ForwardedRef<HTMLInputElement>;
    },
) => JSX.Element;

export default MultiSelectComboBoxCore;