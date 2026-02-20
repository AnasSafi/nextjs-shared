import {useState} from "react";
import type {FieldValues} from "react-hook-form";
import {RegularFormPropsModel} from "../../models/core/formModels";
import {UseRegularFormFunction} from "../../models/ui/modalModels";
import {TranslateFn} from "../../models/core/localeModels";

export type UseTranslationHook = () => {t: TranslateFn};

export function createUseRegularForm(useTranslationHook: UseTranslationHook) {
    return function useRegularForm<TFieldValues extends FieldValues>(
        props: RegularFormPropsModel,
        bodyData: TFieldValues,
        useFormFunction: UseRegularFormFunction<TFieldValues>,
    ) {
        const {t} = useTranslationHook();
        const [inProgress, setInProgress] = useState(false);

        const {register, errors, onSubmit, requiredFields} = useFormFunction(
            setInProgress,
            props,
            bodyData,
        );

        return {
            t,
            inProgress,
            setInProgress,
            register,
            errors,
            onSubmit,
            requiredFields,
        };
    };
}