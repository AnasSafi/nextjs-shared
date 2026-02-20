import React, {useEffect, useImperativeHandle, useState} from "react";
import type {FieldValues} from "react-hook-form";
import type {TranslateFn} from "../../models/core/localeModels";
import {useModalStore} from "../../store/modalStore";
import {UseFormFunctionModel} from "../../models/ui/modalModels";
import {FormPropsModel, FormRefModel} from "../../models/core/formModels";

type UseModalFormReturn<
    TFieldValues extends FieldValues,
    TIn = unknown,
    TClose = unknown
> = {
    t: TranslateFn;
    inProgress: boolean;
    setInProgress: React.Dispatch<React.SetStateAction<boolean>>;
    register: ReturnType<UseFormFunctionModel<TFieldValues, TIn, TClose>>["register"];
    errors: ReturnType<UseFormFunctionModel<TFieldValues, TIn, TClose>>["errors"];
    onSubmit: ReturnType<UseFormFunctionModel<TFieldValues, TIn, TClose>>["onSubmit"];
    requiredFields: ReturnType<UseFormFunctionModel<TFieldValues, TIn, TClose>>["requiredFields"];
};

export type TranslationLike = { t: TranslateFn };

export function createUseModalForm<TTranslation extends TranslationLike>(
    useTranslationHook: () => TTranslation,
) {
    return function useModalForm<
        TFieldValues extends FieldValues,
        TIn = unknown,
        TClose = unknown
    >(
        {
            ref,
            props,
            bodyData,
            closeModalWithData,
            useFormFunction,
        }: {
            ref: React.ForwardedRef<FormRefModel | null>;
            props: FormPropsModel<TIn, TClose>;
            bodyData: TFieldValues;
            closeModalWithData: (value: TClose) => void;
            useFormFunction?: UseFormFunctionModel<TFieldValues, TIn, TClose> | null;
        },
    ): UseModalFormReturn<TFieldValues, TIn, TClose> {
        const {t} = useTranslationHook();
        const [inProgress, setInProgress] = useState(false);
        const {setModalInProgress} = useModalStore();

        if (!useFormFunction) {
            throw new Error("useModalForm: 'useFormFunction' is required but was not provided.");
        }

        const {register, errors, onSubmit, requiredFields} = useFormFunction(
            setInProgress,
            props,
            bodyData,
            closeModalWithData,
        );

        useEffect(() => {
            if (props.modalId) setModalInProgress(props.modalId, inProgress);
        }, [inProgress, props.modalId, setModalInProgress]);

        useImperativeHandle(
            ref,
            () => ({submitForm: () => onSubmit()}),
            [onSubmit],
        );

        return {t, inProgress, setInProgress, register, errors, onSubmit, requiredFields};
    };
}