import {create} from "zustand";
import type {ModalModel, ModalStateModel} from "../models/ui/modalModels";

export const getTopmostOpenModalId = (
    modals: Record<string, ModalModel>,
    modalStack: string[] = Object.keys(modals),
): string | undefined => {
    for (let i = modalStack.length - 1; i >= 0; i -= 1) {
        const id = modalStack[i];
        if (modals[id]?.isOpen) return id;
    }

    return undefined;
};

export const useModalStore = create<ModalStateModel>((set) => ({
    modals: {},
    modalStack: [],
    openModal: (id, content, config) =>
        set((state) => ({
            modals: {
                ...state.modals,
                [id]: {content, isOpen: true, config},
            },
            modalStack: [...(state.modalStack ?? []).filter((modalId) => modalId !== id), id],
        })),
    closeModal: (id) =>
        set((state) => ({
            modals: {
                ...state.modals,
                ...(state.modals[id]
                    ? {[id]: {...state.modals[id], isOpen: false}}
                    : {}),
            },
            modalStack: (state.modalStack ?? []).filter((modalId) => modalId !== id),
        })),
    setModalInProgress: (id, value) =>
        set((state) => ({
            modals: {
                ...state.modals,
                ...(state.modals[id]
                    ? {[id]: {...state.modals[id], inProgressModal: value}}
                    : {}),
            },
        })),
}));

export const useLastOpenModal = (): string | undefined => {
    const modals: Record<string, ModalModel> = useModalStore((state) => state.modals);
    const modalStack: string[] = useModalStore(
        (state) => state.modalStack ?? Object.keys(state.modals),
    );
    return getTopmostOpenModalId(modals, modalStack);
};
