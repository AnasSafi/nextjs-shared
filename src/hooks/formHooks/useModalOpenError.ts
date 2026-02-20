import type {TFunction} from "i18next";
import {useModalStore} from "../../store/modalStore";
import {useErrorMessageModalActions} from "../modalHooks/useErrorMessageModalActions";
import {FetchError} from "../../extensions/FetchError";

export function createUseModalOpenError(t: TFunction) {
    return function useModalOpenError() {
        const {closeModal} = useModalStore();
        const {openErrorMessageModal} = useErrorMessageModalActions(t);

        const handleModalOpenError = (
            {modalId, error}: { modalId?: string; error: unknown },
        ) => {
            if (modalId) {
                closeModal(modalId);
            }

            if (error instanceof FetchError) {
                openErrorMessageModal({
                    title: error.serverError?.error.title ?? "",
                    message: error.serverError?.error.message ?? "",
                });
            }
        };

        return {handleModalOpenError};
    };
}