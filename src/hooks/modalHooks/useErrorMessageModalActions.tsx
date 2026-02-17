"use client";

import React from "react";
import {useModalStore} from "../../store/modalStore";
import {DialogType} from "../../models/ui/modalModels";
import ValidationErrorsList, {type ValidationErrorItem} from "../../components/Modals/ValidationErrorsList";
import {generateUniqueString} from "../../utils/stringUtils";

export function useErrorMessageModalActions(t: (key: string) => string) {
    const {openModal} = useModalStore();

    type MessageModalParams = {
        title: string;
        message: string;
        validationErrors?: ValidationErrorItem[];
    };

    const openErrorMessageModal = ({title, message, validationErrors}: MessageModalParams) => {
        const content =
            validationErrors && validationErrors.length > 0 ? (
                <ValidationErrorsList items={validationErrors} t={t} />
            ) : null;

        openModal(generateUniqueString(), content, {
            dialogTitle: title,
            dialogMessage: message,
            showIcon: true,
            dialogType: DialogType.Error,
            dialogMaxWidthClass: "sm:max-w-xl sm:my-8 max-w-xs",
        });
    };

    return {
        openErrorMessageModal,
    };
}