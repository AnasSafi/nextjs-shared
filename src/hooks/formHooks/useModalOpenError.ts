import {useModalStore} from "../../store/modalStore";
import {useErrorMessageModalActions} from "../modalHooks/useErrorMessageModalActions";
import {FetchError} from "../../extensions/FetchError";
import {TranslateFn} from "../../models/core/localeModels";

export function createUseModalOpenError(t: TranslateFn) {
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