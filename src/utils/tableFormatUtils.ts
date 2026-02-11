import {getStringFromMultiLangValueByLang} from "./multiLangValueReadUtils";
import {formatNumberWithCommas} from "./numberUtils";
import type {MultiLangValue} from "../models/core/localeModels";

/**
 * Accepts multiple value types (string, number, boolean, translation object)
 * and returns a localized string representation.
 */
export function getStringFromAny(
    val: unknown,
    currentLng: string,
    numberDecimals?: number
): string {
    if (typeof val === "string") return val;

    if (typeof val === "number") {
        return formatNumberWithCommas(val, numberDecimals ?? 0);
    }

    if (typeof val === "boolean") {
        return val ? "True" : "False";
    }

    if (val !== null && typeof val === "object") {
        // Assume translation object
        return getStringFromMultiLangValueByLang(
            val as MultiLangValue,
            currentLng
        );
    }

    return "N/A"; // default case
}
