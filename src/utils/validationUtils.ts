import type {SchemaDescription} from "yup";
import type {AnySchema} from "yup";
import {normalizeMultiLangValue} from "./localeUtils";
import {getInputLanguages, getRequiredInputLanguages, LanguageConfig} from "../i18n/languageConfigUtils";
import {convertToThreeCharLocale, isAcceptedLocale} from "../i18n/localeMaps";

type YupTest = {
    name?: string;
};

type YupFieldDescription = {
    type: string;
    tests?: YupTest[];
    innerType?: {
        fields?: {
            [key: string]: YupFieldDescription;
        };
    };
    fields?: {
        [key: string]: YupFieldDescription;
    };
};

interface ExtendedSchemaDescription extends SchemaDescription {
    fields?: {
        [key: string]: YupFieldDescription;
    };
}

export const extractRequiredFields = (schema: AnySchema, parentKey: string = ""): string[] => {
    const requiredFields: string[] = [];

    if (schema && typeof (schema as AnySchema).describe === "function") {
        const description = (schema as AnySchema).describe() as ExtendedSchemaDescription;

        if (description.fields) {
            Object.keys(description.fields || {}).forEach((fieldKey) => {
                const field = description.fields?.[fieldKey];
                const fullKey = parentKey ? `${parentKey}*${fieldKey}` : fieldKey;

                if (field?.type === "array" && field.innerType) {
                    if (field.tests?.some((test: YupTest) => test.name === "notNull")) {
                        requiredFields.push(fullKey);
                    }

                    if (field.innerType.fields) {
                        Object.entries(field.innerType.fields).forEach(([innerKey, innerField]) => {
                            if (innerField.tests?.some((test: YupTest) => test.name === "notNull")) {
                                requiredFields.push(`${fullKey}[]*${innerKey}`);
                            }
                        });
                    }
                } else if (field?.type === "object" && field.fields) {
                    Object.entries(field.fields).forEach(([nestedKey, nestedField]) => {
                        const nestedFullKey = `${fullKey}*${nestedKey}`;
                        if (nestedField.tests?.some((test: YupTest) => test.name === "notNull")) {
                            requiredFields.push(nestedFullKey);
                        }

                        if (nestedField.type === "object" && nestedField.fields) {
                            Object.entries(nestedField.fields).forEach(([deepKey, deepField]) => {
                                if (deepField.tests?.some((test: YupTest) => test.name === "notNull")) {
                                    requiredFields.push(`${nestedFullKey}*${deepKey}`);
                                }
                            });
                        }
                    });
                } else if (field && Array.isArray(field.tests)) {
                    const isRequired = field.tests.some((test: YupTest) => test.name === "notNull");
                    if (isRequired) {
                        requiredFields.push(fullKey);
                    }
                }
            });
        }
    }

    return requiredFields;
};

type YupLike = {
    string: () => any;
    object: () => any;
};

export const createGenerateMultiLangTextValidationSchema = (args: {
    languages: LanguageConfig[];
    yup: YupLike;
}) => {
    const {languages, yup} = args;

    return ({
                minLength,
                maxLength,
                forceLanguageCharacters = false,
                isNullable,
            }: {
        minLength?: number;
        maxLength?: number;
        forceLanguageCharacters?: boolean;
        isNullable?: boolean;
    }) => {
        const shapeObject: Record<string, any> = {};

        const inputLanguages: string[] = getInputLanguages(languages);
        const requiredInputLanguages: string[] = getRequiredInputLanguages(languages);

        const to3 = (lang: string): string => {
            const l = String(lang ?? "").toLowerCase().trim();
            if (!l) return l;
            if (l.length === 3) return l;
            const mapped = convertToThreeCharLocale(l);
            return mapped ?? l;
        };

        const required3 = new Set(requiredInputLanguages.map(to3));
        const uniqueLang3 = Array.from(new Set(inputLanguages.map(to3)));

        uniqueLang3.forEach((lang3) => {
            if (!lang3 || lang3.length !== 3) return;
            if (!isAcceptedLocale(lang3)) return;

            let s = yup.string().nullable();

            if (required3.has(lang3) && !isNullable) {
                s = s.notNull();
            } else {
                s = s.nullable().transform((value: any) => (value === undefined ? null : value));
            }

            if (minLength) s = s.minLength(minLength);
            if (maxLength) s = s.maxLength(maxLength);

            if (forceLanguageCharacters) {
                if (lang3 === "eng") {
                    s = s.englishText();
                } else if (lang3 === "ara") {
                    s = s.arabicText();
                }
            }

            shapeObject[lang3] = s;
        });

        return yup
            .object()
            .transform((value: any) => normalizeMultiLangValue(value, "3"))
            .shape(shapeObject);
    };
};