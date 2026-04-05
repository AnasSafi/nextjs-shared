"use client";

import {
    type FC,
    type JSX,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
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
import {
    MAP_CANCEL_INTERACTION_EVENT,
    MAP_INTERACTION_ACTIVE_ATTR,
    MAP_INTERACTION_ROOT_ATTR,
} from "../Form/mapInteractionConstants";

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

const MODAL_HISTORY_TOKEN_KEY = "__shared_modal_token__";

const getModalHistoryToken = (state: unknown): string | null => {
    if (!state || typeof state !== "object") return null;
    const token = (state as Record<string, unknown>)[MODAL_HISTORY_TOKEN_KEY];
    return typeof token === "string" && token.trim().length > 0 ? token : null;
};

const withModalHistoryToken = (state: unknown, token: string): Record<string, unknown> => {
    if (state && typeof state === "object") {
        return {
            ...(state as Record<string, unknown>),
            [MODAL_HISTORY_TOKEN_KEY]: token,
        };
    }

    return {
        [MODAL_HISTORY_TOKEN_KEY]: token,
    };
};

const shouldIgnoreModalEnter = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLTextAreaElement) return true;
    if (target.isContentEditable) return true;

    return Boolean(
        target.closest(
            [
                "input",
                "textarea",
                "select",
                "button",
                "a[href]",
                '[role="combobox"]',
                '[role="textbox"]',
                '[role="listbox"]',
                '[contenteditable="true"]',
            ].join(","),
        ),
    );
};

export const ModalTemplateCore: FC<ModalTemplateProps> = (
    {id, children, t}: ModalTemplateProps,
): JSX.Element => {
    const lastOpenModalId: string | undefined = useLastOpenModal();
    const modal: ModalModel = useModalStore((s: ModalStateModel): ModalModel => s.modals[id]);
    const closeModal = useModalStore((s: ModalStateModel) => s.closeModal);
    const scrollableRef = useRef<HTMLDivElement | null>(null);
    const modalContentRef = useRef<HTMLDivElement | null>(null);
    const modalHistoryTokenRef = useRef<string | null>(null);
    const requestCloseRef = useRef<(
        args: {mode: "dismiss" | "cancel"; respectPreventCloseOutside?: boolean}
    ) => void>(() => {
    });
    const isModalOpenRef = useRef<boolean>(Boolean(modal?.isOpen));
    const lastOpenModalIdRef = useRef<string | undefined>(lastOpenModalId);
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState<boolean>(false);
    const [pendingCloseMode, setPendingCloseMode] = useState<"dismiss" | "cancel">("dismiss");

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
                hasUnsavedChanges: null,
                unsavedChangesTitle: "unsavedChangesTitle",
                unsavedChangesMessage: "unsavedChangesMessage",
                unsavedChangesCloseButtonText: "close",
                unsavedChangesCancelButtonText: "cancel",
                ...modal?.config,
            }),
            [modal?.config],
        );

    const closeModalNow = useCallback(() => {
        closeModal(id);
        config.onCloseModal?.();
    }, [closeModal, id, config]);

    const requestClose = useCallback((
        {
            mode,
            respectPreventCloseOutside = false,
        }: {
            mode: "dismiss" | "cancel";
            respectPreventCloseOutside?: boolean;
        },
    ): void => {
        if (respectPreventCloseOutside && config.preventCloseOutside) return;

        if (config.hasUnsavedChanges?.()) {
            setPendingCloseMode(mode);
            setIsCloseConfirmOpen(true);
            return;
        }

        if (mode === "cancel") {
            config.cancelButtonOnClick?.();
        }

        closeModalNow();
    }, [closeModalNow, config]);

    const confirmClose = useCallback((): void => {
        if (pendingCloseMode === "cancel") {
            config.cancelButtonOnClick?.();
        }

        setIsCloseConfirmOpen(false);
        setPendingCloseMode("dismiss");
        closeModalNow();
    }, [closeModalNow, config, pendingCloseMode]);

    const keepModalOpen = useCallback((): void => {
        setIsCloseConfirmOpen(false);
        setPendingCloseMode("dismiss");
    }, []);

    const handleClose = useCallback(() => {
        requestClose({mode: "dismiss", respectPreventCloseOutside: true});
    }, [requestClose]);

    const handleCancel = useCallback(() => {
        requestClose({mode: "cancel"});
    }, [requestClose]);

    const handleAccept = useCallback(() => {
        config.acceptButtonOnClick?.();
    }, [config]);

    const cancelActiveMapInteraction = useCallback((): boolean => {
        const root = modalContentRef.current;
        if (!root) return false;

        const activeMapRoot = root.querySelector<HTMLElement>(
            `[${MAP_INTERACTION_ROOT_ATTR}="true"][${MAP_INTERACTION_ACTIVE_ATTR}="true"]`,
        );

        if (!activeMapRoot) return false;

        activeMapRoot.dispatchEvent(new CustomEvent(MAP_CANCEL_INTERACTION_EVENT));
        return true;
    }, []);

    useEffect(() => {
        requestCloseRef.current = requestClose;
    }, [requestClose]);

    useEffect(() => {
        isModalOpenRef.current = Boolean(modal?.isOpen);
    }, [modal?.isOpen]);

    useEffect(() => {
        lastOpenModalIdRef.current = lastOpenModalId;
    }, [lastOpenModalId]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!modal?.isOpen) return;

        const pushModalHistoryEntry = (): string | null => {
            const token = `${id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
            try {
                window.history.pushState(
                    withModalHistoryToken(window.history.state, token),
                    "",
                );
                return token;
            } catch {
                return null;
            }
        };

        modalHistoryTokenRef.current = pushModalHistoryEntry();

        const handlePopState = (event: PopStateEvent): void => {
            const activeToken = modalHistoryTokenRef.current;
            if (!activeToken) return;
            if (!isModalOpenRef.current) return;
            if (lastOpenModalIdRef.current !== id) return;

            const nextStateToken = getModalHistoryToken(event.state);
            if (nextStateToken === activeToken) return;

            modalHistoryTokenRef.current = null;
            requestCloseRef.current({mode: "dismiss"});

            window.setTimeout(() => {
                if (!isModalOpenRef.current) return;
                modalHistoryTokenRef.current = pushModalHistoryEntry();
            }, 0);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);

            const activeToken = modalHistoryTokenRef.current;
            if (!activeToken) return;

            modalHistoryTokenRef.current = null;

            if (getModalHistoryToken(window.history.state) === activeToken) {
                window.history.back();
            }
        };
    }, [id, modal?.isOpen]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent): void => {
            if (lastOpenModalId !== id) return;
            if (e.defaultPrevented) return;

            if (e.key === "Enter") {
                if (e.defaultPrevented) return;
                if (isCloseConfirmOpen) return;
                if (shouldIgnoreModalEnter(e.target)) return;

                e.preventDefault();
                handleAccept();
                return;
            }

            if (e.key !== "Escape") return;

            if (isCloseConfirmOpen) {
                e.preventDefault();
                e.stopPropagation();
                keepModalOpen();
                return;
            }

            // Escape priority: cancel active map interaction first, then close modal.
            if (cancelActiveMapInteraction()) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            requestClose({mode: "dismiss"});
        };

        document.addEventListener("keydown", onKeyDown as EventListener);
        return () => document.removeEventListener("keydown", onKeyDown as EventListener);
    }, [
        cancelActiveMapInteraction,
        handleAccept,
        id,
        isCloseConfirmOpen,
        keepModalOpen,
        lastOpenModalId,
        requestClose,
    ]);

    useEffect(() => {
        if (modal?.isOpen) return;
        setIsCloseConfirmOpen(false);
        setPendingCloseMode("dismiss");
    }, [modal?.isOpen]);

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
        unsavedChangesTitle,
        unsavedChangesMessage,
        unsavedChangesCloseButtonText,
        unsavedChangesCancelButtonText,
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
                        ref={modalContentRef}
                        className={clsx(
                            "relative flex flex-col rounded-lg bg-white dark:bg-gray-900 shadow-xl transition overflow-hidden",
                            fullHeightScreen
                                ? "w-full max-w-full max-h-full"
                                : "w-full sm:max-w-5xl max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-3rem)] max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
                            dialogMaxWidthClass,
                        )}
                    >
                        {!inProgress && !isCloseConfirmOpen && (
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

                        {!isCloseConfirmOpen && (
                            <div className="shrink-0 mt-4 flex flex-wrap gap-3 px-5 pb-5">
                                {acceptButtonOnClick && (
                                    <CButton
                                        text={t(acceptButtonText ?? "submit")}
                                        onClick={handleAccept}
                                        loading={inProgress}
                                        className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
                                        className="bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                                    />
                                )}
                            </div>
                        )}

                        {isCloseConfirmOpen && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
                                <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800">
                                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {t(unsavedChangesTitle)}
                                    </h4>
                                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                                        {t(unsavedChangesMessage)}
                                    </p>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <CButton
                                            text={t(unsavedChangesCancelButtonText)}
                                            onClick={keepModalOpen}
                                            className="bg-gray-200 text-gray-900 hover:bg-gray-300"
                                        />
                                        <CButton
                                            text={t(unsavedChangesCloseButtonText)}
                                            onClick={confirmClose}
                                            className="bg-red-600 text-white hover:bg-red-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalTemplateCore;
