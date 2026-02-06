import bcrypt from "bcryptjs";

export const generateUniqueString = (): string => {
    const salt = bcrypt.genSaltSync();
    return bcrypt.hashSync("unique-string-1", salt);
};

export const isArabic = (text: string): boolean => {
    const arabicRegex =
        /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/;
    return arabicRegex.test(text);
};

export const isEnglish = (text: string): boolean => {
    const englishRegex = /[A-Za-z]/;
    return englishRegex.test(text);
};

// TODO: make this dynamic (consumer can build their own mapping if needed)
export const getLocalizedJson = (textValue: string): { ara: string; eng: string } => {
    return {
        ara: isArabic(textValue) ? textValue : "",
        eng: isEnglish(textValue) ? textValue : "",
    };
};

export const toLowerCamelCase = (input: string | undefined): string => {
    if (input === undefined) {
        return "undefined";
    }

    let result = "";
    let capitalizeNext = false;

    for (const char of input.trim()) {
        if (char === " " || char === "_") {
            capitalizeNext = true;
        } else {
            if (capitalizeNext) {
                result += char.toUpperCase();
                capitalizeNext = false;
            } else {
                result += char.toLowerCase();
            }
        }
    }

    return result;
};

export const uniqueSuffix = (): string => {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

// Sanitize string
export const sanitizeString = (input: string): string => {
    const harmfulCharactersRegex = /['`"%;()=*+<>-]/g;
    return input.replace(harmfulCharactersRegex, "");
};

// Normalize Arabic characters
export const normalizeArabic = (text: string): string => {
    let out = text;

    // Remove Arabic diacritics
    out = out.replace(/[\u064B-\u0652\u0618-\u061A\u0653-\u0655\u0656-\u065F]/g, "");

    // Replace certain Arabic characters with ا
    out = out.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627");

    return out;
};

// Title case (the first letter of each word is capitalized)
export const toTitleCase = (text?: string | null): string => {
    return (
        text?.replace(/\w\S*/g, (word: string) => {
            return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
        }) ?? ""
    );
};

export const capitalizeFirstLetter = (text: string): string => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
};
