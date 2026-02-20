import type {TranslateFn} from "../../models/core/localeModels";
import {useModalStore} from "../../store/modalStore";
import {useErrorMessageModalActions} from "../modalHooks/useErrorMessageModalActions";
import {FetchError} from "../../extensions/FetchError";

export type TranslationLike = {t: TranslateFn};

export function createUseModalOpenError<TTranslation extends TranslationLike>(
    useTranslationHook: () => TTranslation,
) {
    return function useModalOpenError() {
        const {t} = useTranslationHook();
        const {closeModal} = useModalStore();
        const {openErrorMessageModal} = useErrorMessageModalActions(t);

        const handleModalOpenError = (
            {modalId, error}: {modalId?: string; error: unknown},
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