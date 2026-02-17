"use client";

import {
    type FC,
    type JSX,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";
import {
    BellIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    FaceFrownIcon,
    InformationCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import {CButton} from "../Form/CButton";
import {useLastOpenModal, useModalStore} from "../../store/modalStore";
import {DialogType} from "../../models/ui/modalModels";
import type {
    ModalModel,
    ModalStateModel,
    ModalTemplateProps,
    OptionalModalTemplateProps,
} from "../../models/ui/modalModels";

const ICONS: Record<DialogType, any> = {
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: FaceFrownIcon,
    alert: BellIcon,
    success: CheckIcon,
};

const ICON_STYLES: Record<DialogType, string> = {
    info: "bg-gray-100 text-gray-600",
    warning: "bg-yellow-100 text-yellow-600",
    error: "bg-red-100 text-red-600",
    alert: "bg-purple-100 text-purple-600",
    success: "bg-green-100 text-green-600",
};

export const ModalTemplateCore: FC<ModalTemplateProps> = (
    {id, children, t}: ModalTemplateProps,
): JSX.Element => {
    const lastOpenModalId: string | undefined = useLastOpenModal();
    const modal: ModalModel = useModalStore((s: ModalStateModel): ModalModel => s.modals[id]);
    const closeModal = useModalStore((s: ModalStateModel) => s.closeModal);
    const scrollableRef = useRef<HTMLDivElement | null>(null);

    const config: Required<OptionalModalTemplateProps> =
        useMemo<Required<OptionalModalTemplateProps>>(
            () => ({
                dialogType: DialogType.Info,
                dialogTitle: "",
                dialogMessage: "",
                dialogMaxWidthClass: "",
                fullHeightScreen: false,
                showIcon: false,
                withMinHeight: false,
                preventCloseOutside: true,
                onCloseModal: (): void => {},
                acceptButtonText: "submit",
                acceptButtonOnClick: null,
                button1Text: "Button 1",
                button1OnClick: null,
                button2Text: "Button 2",
                button2OnClick: null,
                cancelButtonText: "close",
                cancelButtonOnClick: null,
                showCancelButton: true,
                ...modal?.config,
            }),
            [modal?.config],
        );

    const handleClose = useCallback(() => {
        if (config.preventCloseOutside) return;
        closeModal(id);
        config.onCloseModal?.();
    }, [closeModal, id, config]);

    const handleCancel = useCallback(() => {
        config.cancelButtonOnClick?.();
        closeModal(id);
        config.onCloseModal?.();
    }, [config, closeModal, id]);

    const handleAccept = useCallback(() => {
        config.acceptButtonOnClick?.();
    }, [config]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent): void => {
            if (lastOpenModalId !== id) return;
            if (e.target instanceof HTMLTextAreaElement) return;

            if (e.key === "Enter") {
                e.preventDefault();
                handleAccept();
            }
            if (e.key === "Escape") {
                closeModal(id);
                config.onCloseModal?.();
            }
        };

        document.addEventListener("keydown", onKeyDown as EventListener);
        return () => document.removeEventListener("keydown", onKeyDown as EventListener);
    }, [id, lastOpenModalId, closeModal, handleAccept, config]);

    useEffect(() => {
        if (modal?.isOpen) {
            const original = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = original;
            };
        }
    }, [modal?.isOpen]);

    useLayoutEffect(() => {
        if (modal?.isOpen && scrollableRef.current) {
            scrollableRef.current.scrollTo({top: 0, behavior: "auto"});
            scrollableRef.current.focus();
        }
    }, [modal?.isOpen]);

    if (!modal?.isOpen) return <></>;

    const inProgress: boolean | undefined = modal.inProgressModal;

    const {
        dialogType,
        dialogTitle,
        dialogMessage,
        dialogMaxWidthClass,
        fullHeightScreen,
        showIcon,
        withMinHeight,
        acceptButtonText,
        acceptButtonOnClick,
        button1Text,
        button1OnClick,
        button2Text,
        button2OnClick,
        cancelButtonText,
        showCancelButton,
    } = config;

    const Icon = showIcon && dialogType ? ICONS[dialogType] : null;
    const iconClass: string | null = dialogType ? ICON_STYLES[dialogType] : null;

    const MESSAGE_STYLES: Record<DialogType, string> = {
        info: "text-gray-700 dark:text-gray-200",
        warning: "text-yellow-800 dark:text-yellow-200",
        error: "text-red-800 dark:text-red-200",
        alert: "text-purple-800 dark:text-purple-200",
        success: "text-green-800 dark:text-green-200",
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="fixed inset-0 z-40 bg-black/75" onClick={handleClose} />

            <div className="fixed inset-0 z-40 flex items-center justify-center">
                <div
                    className={clsx(
                        "fixed inset-0 z-50 flex items-center justify-center",
                        fullHeightScreen ? "p-2 sm:p-4" : "p-4 sm:p-6",
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className={clsx(
                            "relative flex flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl transition overflow-hidden",
                            fullHeightScreen
                                ? "w-full max-w-full max-h-full"
                                : "w-full sm:max-w-5xl max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
                            dialogMaxWidthClass,
                        )}
                    >
                        {!inProgress && (
                            <button
                                aria-label="Close"
                                onClick={handleCancel}
                                className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-500"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        )}

                        <div className="shrink-0 px-5 pt-12">
                            {showIcon && Icon && (
                                <div
                                    className={clsx(
                                        "mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full",
                                        iconClass,
                                    )}
                                >
                                    <Icon className="h-7 w-7" />
                                </div>
                            )}

                            {dialogTitle && (
                                <h3 className="text-center text-base font-semibold text-gray-900 dark:text-white">
                                    {dialogTitle}
                                </h3>
                            )}

                            {dialogMessage && (
                                <p className={clsx("mt-2 text-sm", MESSAGE_STYLES[dialogType ?? "info"])}>
                                    {dialogMessage}
                                </p>
                            )}
                        </div>

                        <div
                            ref={scrollableRef}
                            tabIndex={-1}
                            className={clsx(
                                "flex-1 overflow-y-auto min-h-0 px-5",
                                "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0",
                                withMinHeight && "min-h-[350px]",
                            )}
                        >
                            {children}
                        </div>

                        <div className="shrink-0 mt-4 flex flex-wrap gap-3 px-5 pb-5">
                            {acceptButtonOnClick && (
                                <CButton
                                    text={t(acceptButtonText ?? "submit")}
                                    onClick={handleAccept}
                                    loading={inProgress}
                                    className="bg-gray-700 dark:bg-gray-900 text-white hover:bg-gray-500"
                                />
                            )}
                            {button1OnClick && (
                                <CButton
                                    text={t(button1Text ?? "Button 1")}
                                    onClick={button1OnClick}
                                    className="bg-gray-700 text-white hover:bg-gray-500"
                                />
                            )}
                            {button2OnClick && button2Text && (
                                <CButton
                                    text={t(button2Text)}
                                    onClick={button2OnClick}
                                    className="bg-red-600 text-white hover:bg-red-500"
                                />
                            )}
                            {showCancelButton && !inProgress && (
                                <CButton
                                    text={cancelButtonText ? t(cancelButtonText) : t("close")}
                                    onClick={handleCancel}
                                    className="bg-gray-200 text-gray-900 hover:bg-gray-300"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalTemplateCore;
