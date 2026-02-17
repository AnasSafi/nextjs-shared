"use client";

import React from "react";
import {useReusableModal} from "./useReusableModal";
import type {AllowedUserType} from "./useModalActions";
import type {FormPropsModel, FormRefModel} from "../../models/core/formModels";

export type OpenModalOptions<TIn> = {
    data?: TIn;
    dialogTitle?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
}

function isOpenModalOptions<TIn>(x: unknown): x is OpenModalOptions<TIn> {
    if (!isRecord(x)) return false;
    return "dialogTitle" in x || "data" in x;
}

export function createModalHook<TIn, TOut = TIn>(config: {
    t: (key: string) => string;

    modalId: string;
    dialogTitleKey: string;

    FormComponent: React.ForwardRefExoticComponent<
        React.PropsWithoutRef<FormPropsModel<TIn, TOut>> &
        React.RefAttributes<FormRefModel>
    >;

    allowed?: AllowedUserType;
    acceptButtonText?: string;
    withMinHeight?: boolean;
    dialogMaxWidthClass?: string;
    readOnly?: boolean;
    fullHeightScreen?: boolean;
}) {
    return function useGeneratedModal() {
        const {openModal} = useReusableModal<TIn, TOut>({
            t: config.t,
            allowed: config.allowed ?? "Users",
            modalId: config.modalId,
            dialogTitleKey: config.dialogTitleKey,
            FormComponent: config.FormComponent,
            acceptButtonText: config.acceptButtonText,
            withMinHeight: config.withMinHeight,
            dialogMaxWidthClass: config.dialogMaxWidthClass,
            readOnly: config.readOnly,
            fullHeightScreen: config.fullHeightScreen,
        });

        function typedOpenModal(options: OpenModalOptions<TIn>): Promise<TOut | null>;
        function typedOpenModal(): Promise<TOut | null>;
        function typedOpenModal(modalData: TIn): Promise<TOut | null>;
        function typedOpenModal(modalData: TIn | undefined, dialogTitle: string): Promise<TOut | null>;
        function typedOpenModal(
            a?: TIn | OpenModalOptions<TIn>,
            dialogTitleArg?: string,
        ): Promise<TOut | null> {
            if (isOpenModalOptions<TIn>(a)) {
                const data = a.data as TIn | undefined;
                const title = a.dialogTitle;
                return title !== undefined
                    ? (openModal(data as TIn, title) as Promise<TOut | null>)
                    : (openModal(data as TIn) as Promise<TOut | null>);
            }

            return dialogTitleArg !== undefined
                ? (openModal(a as TIn, dialogTitleArg) as Promise<TOut | null>)
                : (openModal(a as TIn) as Promise<TOut | null>);
        }

        return {openModal: typedOpenModal};
    };
}