import {create} from "zustand";
import type {ModalModel, ModalStateModel} from "../models/ui/modalModels";

export const useModalStore = create<ModalStateModel>((set) => ({
    modals: {},
    openModal: (id, content, config) =>
        set((state) => ({
            modals: {
                ...state.modals,
                [id]: {content, isOpen: true, config},
            },
        })),
    closeModal: (id) =>
        set((state) => ({
            modals: {
                ...state.modals,
                [id]: {...state.modals[id], isOpen: false},
            },
        })),
    setModalInProgress: (id, value) =>
        set((state) => ({
            modals: {
                ...state.modals,
                [id]: {...state.modals[id], inProgressModal: value},
            },
        })),
}));

export const useLastOpenModal = (): string | undefined => {
    const modals: Record<string, ModalModel> = useModalStore((state) => state.modals);
    return Object.keys(modals).reverse().find((id) => modals[id].isOpen);
};