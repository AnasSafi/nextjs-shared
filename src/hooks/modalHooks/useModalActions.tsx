"use client";

import React, {useCallback, useRef} from "react";
import {useModalStore} from "../../store/modalStore";
import {useUserStore} from "../../store/userStore";
import type {FormPropsModel, FormRefModel} from "../../models/core/formModels";
import {useErrorMessageModalActions} from "./useErrorMessageModalActions";

export type AllowedUserType = "Users" | "Guests" | "All";

export type UseModalActionsProps<TIn, TOut = TIn> = {
    t: (key: string) => string;

    modalId: string;
    dialogTitleKey: string;

    FormComponent: React.ForwardRefExoticComponent<
        React.PropsWithoutRef<FormPropsModel<TIn, TOut>> &
        React.RefAttributes<FormRefModel>
    >;

    allowed?: AllowedUserType;
    readOnly?: boolean;

    dialogMaxWidthClass?: string;
    fullHeightScreen?: boolean;
    acceptButtonText?: string | null;
    withMinHeight?: boolean;
};

export function useModalActions<TIn, TOut = TIn>(
    {
        t,
        modalId,
        FormComponent,
        dialogTitleKey,
        allowed = "All",
        readOnly = false,
        dialogMaxWidthClass,
        fullHeightScreen,
        acceptButtonText,
        withMinHeight,
    }: UseModalActionsProps<TIn, TOut>,
) {
    const {user} = useUserStore();
    const {openModal} = useModalStore();
    const formRef = useRef<FormRefModel>(null);
    const {openErrorMessageModal} = useErrorMessageModalActions(t);

    const canOpenModal = useCallback((): boolean => {
        switch (allowed) {
            case "Users":
                return !!user;
            case "Guests":
                return !user;
            default:
                return true;
        }
    }, [user, allowed]);

    const openModalAction = useCallback(
        (modalData?: TIn, opts?: {dialogTitle?: string}) => {
            if (canOpenModal()) {
                openModal(
                    modalId,
                    (
                        <FormComponent
                            modalId={modalId}
                            data={modalData}
                            closeModalWithData={(value: TOut) => {
                                void value;
                            }}
                            ref={formRef}
                        />
                    ),
                    {
                        dialogMaxWidthClass,
                        dialogTitle: opts?.dialogTitle ?? t(dialogTitleKey),
                        acceptButtonText: acceptButtonText ?? null,
                        acceptButtonOnClick: !readOnly
                            ? () => {
                                formRef.current?.submitForm();
                            }
                            : undefined,
                        hasUnsavedChanges: () => Boolean(formRef.current?.hasUnsavedChanges?.()),
                        withMinHeight,
                        fullHeightScreen,
                    },
                );
            } else {
                openErrorMessageModal({
                    title: t("error"),
                    message: t("unauthorizedMessage"),
                });
            }
        },
        [
            canOpenModal,
            openModal,
            modalId,
            FormComponent,
            dialogMaxWidthClass,
            t,
            dialogTitleKey,
            acceptButtonText,
            readOnly,
            withMinHeight,
            fullHeightScreen,
            openErrorMessageModal,
        ],
    );

    return {openModalAction};
}
