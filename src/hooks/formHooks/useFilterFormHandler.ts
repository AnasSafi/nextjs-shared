"use client";

import * as yup from "yup";
import React, {useCallback, useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {useModalStore} from "../../store/modalStore";
import {extractRequiredFields} from "../../utils/validationUtils";
import {createTranslationInputName} from "../../utils/translationUtils";
import type {TranslateFn} from "../../models/core/localeModels";
import {UseFilterFormHandlerProps} from "../../models/core/formModels";
import {useErrorMessageModalActions} from "../modalHooks/useErrorMessageModalActions";

export type UseTranslationHook = () => { t: TranslateFn };

export function createUseFilterFormHandler(useTranslationHook: UseTranslationHook) {
    return function useFilterFormHandler(
        {
            validationSchema,
            bodyData,
            parseToFilterModel,
            modalId,
        }: UseFilterFormHandlerProps) {
        const {t} = useTranslationHook();
        const {closeModal} = useModalStore();
        const {openErrorMessageModal} = useErrorMessageModalActions(t);

        const [firstSubmission, setFirstSubmission] = useState<boolean>(false);

        const {
            register,
            formState: {errors},
            trigger,
            setError,
            clearErrors,
        } = useForm();

        const validateBodyData = useCallback(
            async (data: Record<string, unknown | Array<{ id: string | number }>>) => {
                try {
                    clearErrors();

                    await validationSchema.validate(data, {
                        context: {
                            t,
                            translateFieldName: createTranslationInputName(t),
                        },
                        abortEarly: false,
                    });

                    return true;
                } catch (error) {
                    if (error instanceof yup.ValidationError) {
                        if (error.inner && error.inner.length > 0) {
                            error.inner.forEach((err) => {
                                let fieldName = err.path;

                                if (fieldName) {
                                    const match = fieldName.match(/(.+)\[(\d+)]/);
                                    if (match) {
                                        const dynamicName = match[1];
                                        const index = parseInt(match[2]);
                                        const originalItem =
                                            (data as Record<string, Array<{ id: string | number }>>)[
                                                dynamicName
                                                ]?.[index];

                                        if (originalItem && originalItem.id) {
                                            fieldName = `${dynamicName}*${originalItem.id}`;
                                        }
                                    }

                                    const inputName = fieldName.split(".")[0];
                                    setError(inputName as string, {
                                        type: "manual",
                                        message: err.message,
                                    });
                                }
                            });
                        } else if (error.path) {
                            setError(error.path as string, {
                                type: error.type,
                                message: error.message,
                            });
                        }
                    }

                    return false;
                }
            },
            [validationSchema, setError, clearErrors, t],
        );

        useEffect(() => {
            if (firstSubmission) {
                void validateBodyData(bodyData);
            }
        }, [bodyData, firstSubmission, validateBodyData]);

        const onSubmit = async (event?: React.FormEvent) => {
            if (event) event.preventDefault();
            setFirstSubmission(true);

            if (!(await validateBodyData(bodyData))) {
                openErrorMessageModal({
                    title: t("validationErrorTitle"),
                    message: t("formSubmissionErrorMessage"),
                });
                return;
            }

            if (parseToFilterModel) {
                parseToFilterModel();
            }

            if (modalId) {
                closeModal(modalId);
            }
        };

        const requiredFields: string[] = extractRequiredFields(validationSchema);

        return {register, errors, onSubmit, trigger, requiredFields};
    };
}