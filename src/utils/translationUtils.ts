import type {TranslateFn} from "../models/core/localeModels";

export function translationInputName(inputName: string, t: TranslateFn): string {
    const parts = inputName.split(".");

    if (parts.length === 2) {
        const a = parts[0] ?? "";
        const b = parts[1] ?? "";
        return `${t(a)} - ${t(b)}`;
    }

    return t(inputName);
}

export function createTranslationInputName(t: TranslateFn): (inputName: string) => string {
    return (inputName: string) => translationInputName(inputName, t);
}