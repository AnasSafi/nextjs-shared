"use client";

import React, {forwardRef, useRef} from "react";
import type {FormPropsModel, FormRefModel} from "../../models/core/formModels";
import {useModalActions, type AllowedUserType} from "./useModalActions";

export type UseReusableModalProps<TIn, TOut = TIn> = {
    t: (key: string) => string;

    allowed: AllowedUserType;
    modalId: string;
    dialogTitleKey: string;

    FormComponent: React.ForwardRefExoticComponent<
        React.PropsWithoutRef<FormPropsModel<TIn, TOut>> &
        React.RefAttributes<FormRefModel>
    >;

    readOnly?: boolean;
    dialogMaxWidthClass?: string;
    fullHeightScreen?: boolean;
    acceptButtonText?: string;
    withMinHeight?: boolean;
};

export function useReusableModal<TIn, TOut = TIn>(
    {
        t,
        allowed,
        modalId,
        dialogTitleKey,
        FormComponent,
        readOnly,
        dialogMaxWidthClass,
        fullHeightScreen,
        acceptButtonText,
        withMinHeight,
    }: UseReusableModalProps<TIn, TOut>,
) {
    const resolveRef = useRef<((value: TOut) => void) | null>(null);

    const FormComponentWithClosure = forwardRef<FormRefModel, FormPropsModel<TIn, TOut>>(
        (props, ref) => (
            <FormComponent
                {...props}
                closeModalWithData={(value: TOut) => resolveRef.current?.(value)}
                ref={ref}
            />
        ),
    );

    FormComponentWithClosure.displayName = `${
        FormComponent.displayName || FormComponent.name || "Form"
    }WithClosure`;

    const {openModalAction: openModalWithModalData} = useModalActions<TIn, TOut>({
        t,
        allowed,
        modalId,
        dialogTitleKey,
        FormComponent: FormComponentWithClosure,
        readOnly,
        dialogMaxWidthClass,
        fullHeightScreen,
        acceptButtonText: acceptButtonText ?? null,
        withMinHeight,
    });

    function openModal(): Promise<TOut>;
    function openModal(modalData: TIn): Promise<TOut>;
    function openModal(modalData: TIn | undefined, dialogTitle: string): Promise<TOut>;
    function openModal(modalData?: TIn, dialogTitle?: string) {
        return new Promise<TOut>((resolve) => {
            resolveRef.current = resolve;
            openModalWithModalData(modalData, dialogTitle ? {dialogTitle} : undefined);
        });
    }

    return {openModal};
}