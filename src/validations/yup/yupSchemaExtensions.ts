import {StringSchema, BooleanSchema, ArraySchema, NumberSchema} from "yup";
import {isValidPhoneNumber, parsePhoneNumberFromString} from "libphonenumber-js/max";
import {toLowerCamelCase, sanitizePhonePro} from "../../index";

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string;

type YupContext = {
    t?: TranslateFn;
    translateFieldName?: (path: string) => Promise<string>;
};

declare module "yup" {
    interface StringSchema {
        notNull(): StringSchema;
        emailAddress(): StringSchema;
        minLength(minLength: number): StringSchema;
        maxLength(maxLength: number): StringSchema;
        arabicOrEnglish(): StringSchema;
        arabicText(): StringSchema;
        englishText(): StringSchema;
        validMobileNumber(): StringSchema;
        validUsername(): StringSchema;
        strongPassword(): StringSchema;
        noMoreThanXSpaces(maxSpaces: number): StringSchema;
        dateFormat(): StringSchema;
        dateTimeFormat(opts?: {requireZ?: boolean}): StringSchema;
        greaterThanDate(startDate: string): StringSchema;
        ageBetween(minAgeAllowed: number, maxAgeAllowed: number): StringSchema;
        validUuid(): StringSchema;
    }

    interface BooleanSchema {
        mustChecked(): BooleanSchema;
    }

    interface NumberSchema {
        notNull(): NumberSchema;
        equalOrMoreZero(): NumberSchema;
        moreThan(moreThanValue: number): NumberSchema;
        minValue(minValue: number): NumberSchema;
        maxValue(maxValue: number): NumberSchema;
        mustInteger(): NumberSchema;
        quotientWithoutFractions(dividend: number): NumberSchema;
        greaterThanValue(startValue: number): NumberSchema;
    }

    // @ts-expect-error Missing type definitions in yup for custom array validation methods
    interface ArraySchema {
        // @ts-expect-error Missing type definitions for minLength method in yup ArraySchema
        minLength(minLength: number): ArraySchema;

        // @ts-expect-error Missing type definitions for maxLength method in yup ArraySchema
        maxLength(maxLength: number): ArraySchema;
    }
}

/** Returns a string schema that maps "" -> undefined (never returns null). */
export function stringEmptyToUndefined(yup: typeof import("yup")): StringSchema<string | undefined> {
    return yup
        .string()
        .transform((v) => (typeof v === "string" && v.trim() === "" ? undefined : v)) as StringSchema<
        string | undefined
    >;
}

/** Returns a string schema that maps "" -> null and allows null. */
export function stringEmptyToNull(yup: typeof import("yup")): StringSchema<string | null> {
    return yup
        .string()
        .transform((v) => (typeof v === "string" && v.trim() === "" ? null : v))
        .nullable()
        .notRequired() as StringSchema<string | null>;
}

/** Optional URL: same empty-to-undefined behavior, with url() and maxLength(2048). */
export function stringUrlOptional(yup: typeof import("yup")): StringSchema<string | undefined> {
    return stringEmptyToUndefined(yup).url().max(2048) as StringSchema<string | undefined>;
}

/** Enum-like optional string. */
export function stringEnumOptional<T extends readonly string[]>(
    yup: typeof import("yup"),
    tokens: T,
): StringSchema<T[number] | undefined> {
    return stringEmptyToUndefined(yup)
        .oneOf(tokens as readonly string[]) as unknown as StringSchema<T[number] | undefined>;
}

/** Enum-like nullable string. */
export function stringEnumNullable<T extends readonly string[]>(
    yup: typeof import("yup"),
    tokens: T,
): StringSchema<T[number] | null | undefined> {
    return stringEmptyToNull(yup)
        .oneOf(tokens as readonly string[])
        .nullable()
        .notRequired() as unknown as StringSchema<T[number] | null | undefined>;
}

async function fieldNameFromContext(ctx: YupContext | undefined, path: string): Promise<string> {
    const fn = ctx?.translateFieldName;
    if (!fn) return path;
    try {
        const v = await fn(path);
        return typeof v === "string" && v.trim().length > 0 ? v : path;
    } catch {
        return path;
    }
}

function tFromContext(ctx: YupContext | undefined): TranslateFn {
    return (ctx?.t ?? ((x: string) => x)) as TranslateFn;
}

const ISO_FLEX_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+\-]\d{2}:\d{2})?$/;
const ISO_FLEX_Z_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/;

export function applyYupSchemaExtensions(yup: typeof import("yup")): void {
    StringSchema.prototype.notNull = function () {
        return this.test("notNull", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = value ?? "";

            if (yup.string().required().isValidSync(value)) return true;

            if ((this.parent as any)?.id) {
                return this.createError({
                    path: this.path,
                    message: t("validationIsRequired"),
                });
            }

            return this.createError({
                path: this.path,
                message: t("validationNotNull", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    NumberSchema.prototype.notNull = function () {
        return this.test("notNull", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            const numValue = parseFloat(value as any);

            if (Number.isNaN(numValue)) {
                return this.createError({
                    path: this.path,
                    message: t("validationNotNull", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    NumberSchema.prototype.equalOrMoreZero = function () {
        return this.test("equalOrMoreZero", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? null) as any;
            if (value === null) return true;

            const numValue = parseFloat(value);
            if (Number.isNaN(numValue)) {
                return this.createError({
                    path: this.path,
                    message: t("validationIsNumber", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            if (numValue >= 0) return true;

            return this.createError({
                path: this.path,
                message: t("validationEqualOrMoreZero", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    NumberSchema.prototype.minValue = function (minValue: number) {
        return this.test("minValue", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            const numValue = parseFloat(value as any);
            if (Number.isNaN(numValue) || numValue >= minValue) return true;

            return this.createError({
                path: this.path,
                message: t("validationMinValue", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                    minValue,
                }),
            });
        });
    };

    NumberSchema.prototype.moreThan = function (moreThanValue: number) {
        return this.test("moreThan", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            const numValue = parseFloat(value as any);
            if (Number.isNaN(numValue) || numValue > moreThanValue) return true;

            return this.createError({
                path: this.path,
                message: t("validationMoreThan", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                    moreThanValue,
                }),
            });
        });
    };

    NumberSchema.prototype.maxValue = function (maxValue: number) {
        return this.test("maxValue", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            const numValue = parseFloat(value as any);
            if (Number.isNaN(numValue) || numValue <= maxValue) return true;

            return this.createError({
                path: this.path,
                message: t("validationMaxValue", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                    minValue: maxValue,
                }),
            });
        });
    };

    NumberSchema.prototype.mustInteger = function () {
        return this.test("mustInteger", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? null) as any;
            if (value === null || yup.number().integer().isValidSync(value)) return true;

            return this.createError({
                path: this.path,
                message: t("validationMustInteger", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    NumberSchema.prototype.quotientWithoutFractions = function (dividend: number) {
        return this.test("quotientWithoutFractions", async function (divisor) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            divisor = (divisor ?? null) as any;
            if (divisor === null || divisor === 0) return true;

            const quotient = dividend / (divisor as any);
            if (!Number.isInteger(quotient)) {
                const deps0 = (this.schema as any)?.deps?.[0] as string | undefined;
                return this.createError({
                    path: this.path,
                    message: t("validationQuotientFraction", {
                        divisorFieldName: await fieldNameFromContext(ctx, this.path),
                        dividendFieldName: deps0 ? await fieldNameFromContext(ctx, deps0) : deps0 ?? "",
                    }),
                });
            }

            return true;
        });
    };

    NumberSchema.prototype.greaterThanValue = function (startValue: number) {
        return this.test("greaterThanValue", async function (endValue) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (!endValue || String(endValue).length === 0) return true;

            if (startValue >= (endValue as any)) {
                return this.createError({
                    path: this.path,
                    message: t("validationGreaterThanValue", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.dateFormat = function () {
        return this.test("dateFormat", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? "") as any;

            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (datePattern.test(String(value))) {
                value = `${value}T00:00:00.000Z`;
            }

            const pattern = /^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/;

            if (String(value).length === 0) return true;

            if (pattern.test(String(value))) {
                const dateObj = new Date(String(value));
                if (Number.isNaN(dateObj.getTime())) {
                    return this.createError({
                        path: this.path,
                        message: t("validationIncorrectDateFormat", {
                            fieldName: await fieldNameFromContext(ctx, this.path),
                        }),
                    });
                }

                const newDateString = dateObj.toISOString();
                if (newDateString !== String(value)) {
                    return this.createError({
                        path: this.path,
                        message: t("validationIncorrectDateFormat", {
                            fieldName: await fieldNameFromContext(ctx, this.path),
                        }),
                    });
                }

                return true;
            }

            return this.createError({
                path: this.path,
                message: t("validationIncorrectDateFormat", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    StringSchema.prototype.dateTimeFormat = function (opts?: {requireZ?: boolean}) {
        return this.test("dateTimeFormat", async function (value: unknown) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (value == null || String(value).length === 0) return true;

            const s = String(value).trim();
            const re: RegExp = opts?.requireZ ? ISO_FLEX_Z_RE : ISO_FLEX_RE;

            if (!re.test(s)) {
                return this.createError({
                    path: this.path,
                    message: t("validationIncorrectDateTimeFormat", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            const d = new Date(s);
            if (Number.isNaN(d.getTime())) {
                return this.createError({
                    path: this.path,
                    message: t("validationIncorrectDateTimeFormat", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.greaterThanDate = function (startDate: string) {
        return this.test("greaterThanDate", async function (endDate) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (!endDate || String(endDate).length === 0) return true;

            const formatDateString = (dateStr: string): string => {
                return dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`;
            };

            const formattedStartDate = formatDateString(startDate);
            const formattedEndDate = formatDateString(String(endDate));

            const startDateObj = new Date(formattedStartDate);
            const endDateObj = new Date(formattedEndDate);

            if (endDateObj.getTime() <= startDateObj.getTime()) {
                return this.createError({
                    path: this.path,
                    message: t("validationEndDateNotGreaterThanStartDate", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.ageBetween = function (minAgeAllowed: number, maxAgeAllowed: number) {
        return this.test("ageBetween", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? "") as any;

            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (datePattern.test(String(value))) {
                value = `${value}T00:00:00.000Z`;
            }

            const pattern = /^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/;

            if (String(value).length === 0) return true;

            if (pattern.test(String(value))) {
                const birthDate = new Date(String(value));
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDifference = today.getMonth() - birthDate.getMonth();

                if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                if (age >= minAgeAllowed && age <= maxAgeAllowed) return true;

                return this.createError({
                    path: this.path,
                    message: t("validationAgeNotBetween", {
                        minAge: minAgeAllowed,
                        maxAge: maxAgeAllowed,
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return this.createError({
                path: this.path,
                message: t("validationIncorrectDateFormat", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    StringSchema.prototype.noMoreThanXSpaces = function (x = 2) {
        return this.test("noMoreThanXSpaces", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? "") as any;
            const spaceCount = (String(value).match(/ /g) || []).length;

            if (spaceCount > x) {
                return this.createError({
                    path: this.path,
                    message: t("validationTooManySpaces", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                        maxSpaces: x,
                        actualSpaces: spaceCount,
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.validUuid = function () {
        return this.test("validUuid", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            value = (value ?? "") as any;
            if (String(value).length === 0) return true;

            const uuidRegex: RegExp =
                /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

            if (!uuidRegex.test(String(value))) {
                return this.createError({
                    path: this.path,
                    message: t("validationValidUuid", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.emailAddress = function () {
        return this.test("emailAddress", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (yup.string().email().isValidSync(value as any)) return true;

            return this.createError({
                path: this.path,
                message: t("validationEmailAddress", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    StringSchema.prototype.validMobileNumber = function () {
        return this.test({
            name: "validMobileNumber",
            test: async function (value) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                const {normalized} = sanitizePhonePro(value as any);

                if (String(normalized).length === 0) return true;

                if (isValidPhoneNumber(normalized)) {
                    const phoneNumber = parsePhoneNumberFromString(normalized);
                    const type = phoneNumber?.getType();

                    if (type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE") return true;

                    return this.createError({
                        path: this.path,
                        message: t("validationValidMobileNumberType", {
                            fieldName: await fieldNameFromContext(ctx, this.path),
                            type: t(toLowerCamelCase(type)),
                        }),
                    });
                }

                return this.createError({
                    path: this.path,
                    message: t("validationValidMobileNumber", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            },
            skipAbsent: true,
        });
    };

    StringSchema.prototype.validUsername = function () {
        return this.test("validUsername", async function (value) {
            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (yup.string().email().isValidSync(value as any) || isValidPhoneNumber(String(value ?? ""))) {
                return true;
            }

            return this.createError({
                path: this.path,
                message: t("validationValidUsername", {
                    fieldName: await fieldNameFromContext(ctx, this.path),
                }),
            });
        });
    };

    StringSchema.prototype.minLength = function (minLength: number) {
        return this.test({
            name: "minLength",
            test: async function (value) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                if (String(value ?? "").length === 0 || yup.string().min(minLength).isValidSync(value as any)) {
                    return true;
                }

                return this.createError({
                    path: this.path,
                    message: t("validationMinLength", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                        length: minLength,
                    }),
                });
            },
            skipAbsent: true,
        });
    };

    (ArraySchema.prototype as any).minLength = function (minLength: number) {
        return this.test({
            name: "minLength",
            test: async function (value: unknown) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                if (yup.array().min(minLength).isValidSync(value as any)) return true;

                return this.createError({
                    path: this.path,
                    message: t("validationArrayMinLength", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                        length: minLength,
                    }),
                });
            },
            skipAbsent: true,
        });
    };

    (ArraySchema.prototype as any).maxLength = function (maxLength: number) {
        return this.test({
            name: "maxLength",
            test: async function (value: unknown) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                if (yup.array().max(maxLength).isValidSync(value as any)) return true;

                return this.createError({
                    path: this.path,
                    message: t("validationArrayMaxLength", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                        length: maxLength,
                    }),
                });
            },
            skipAbsent: true,
        });
    };

    StringSchema.prototype.maxLength = function (maxLength: number) {
        return this.test({
            name: "maxLength",
            test: async function (value) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                if (String(value ?? "").length === 0 || yup.string().max(maxLength).isValidSync(value as any)) {
                    return true;
                }

                return this.createError({
                    path: this.path,
                    message: t("validationMaxLength", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                        length: maxLength,
                    }),
                });
            },
            skipAbsent: true,
        });
    };

    StringSchema.prototype.arabicOrEnglish = function () {
        return this.test("arabicOrEnglish", async function (value) {
            if (!value) return true;

            const arabicRegex = /^[\u0621-\u063A\u0641-\u064A\s]+$/;
            const englishRegex = /^[A-Za-z\s]+$/;

            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (!arabicRegex.test(String(value)) && !englishRegex.test(String(value))) {
                return this.createError({
                    path: this.path,
                    message: t("validationArabicOrEnglish", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.arabicText = function () {
        return this.test("arabicText", async function (value) {
            if (!value) return true;

            const arabicRegex = /^[\u0600-\u06FF\s]+$/;

            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (!arabicRegex.test(String(value))) {
                return this.createError({
                    path: this.path,
                    message: t("validationArabicText", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.englishText = function () {
        return this.test("englishText", async function (value) {
            if (!value) return true;

            const englishRegex = /^[A-Za-z\s]+$/;

            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            if (!englishRegex.test(String(value))) {
                return this.createError({
                    path: this.path,
                    message: t("validationEnglishText", {
                        fieldName: await fieldNameFromContext(ctx, this.path),
                    }),
                });
            }

            return true;
        });
    };

    StringSchema.prototype.strongPassword = function () {
        return this.test({
            name: "strongPassword",
            test: async function (value) {
                const ctx = this.options.context as YupContext | undefined;
                const t = tFromContext(ctx);

                const s = String(value ?? "");
                const hasCharacter = /[^\d!@#$%^&*(),.?":{}|<>]/.test(s);
                const hasDigits = /\d/.test(s);
                const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(s);

                if (hasCharacter && hasDigits && hasSpecialChars) return true;

                return this.createError({
                    path: this.path,
                    message: t("validationPasswordNotStrong"),
                });
            },
            skipAbsent: true,
        });
    };

    BooleanSchema.prototype.mustChecked = function () {
        return this.test("mustChecked", async function (value) {
            if (value && yup.boolean().oneOf([true]).isValidSync(value as any)) return true;

            const ctx = this.options.context as YupContext | undefined;
            const t = tFromContext(ctx);

            return this.createError({
                path: this.path,
                message: t("validationMustChecked", {
                    fieldName: t(this.path),
                }),
            });
        });
    };
}
