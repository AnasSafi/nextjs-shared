"use client";
import React, {
    ChangeEvent,
    ChangeEventHandler,
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useMemo,
    useState,
} from "react";
import {EyeIcon, EyeSlashIcon} from "@heroicons/react/20/solid";
import type {LanguageConfig} from "../../i18n/languageConfigUtils";
import {getInputLanguages, getRequiredInputLanguages, isLanguageRTL} from "../../i18n/languageConfigUtils";
import {convertToThreeCharLocale, convertToTwoCharLocale} from "../../i18n/localeMaps";
import type {RHFFieldError} from "../../models/core/formModels";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {isLocaleObject} from "../../utils/localizationUtils";
import {toGoodPhone} from "../../utils/phoneUtils";
import type {SanitizePhoneOptions} from "../../utils/phoneUtils";

/* ---------------- helpers: normalize codes & read values ---------------- */

const toTwo = (code: string | undefined): string => {
    if (!code) return "";
    return convertToTwoCharLocale(code) ?? code.toLowerCase().replace("_", "-").split("-")[0];
};

const toThree = (code: string | undefined): string => {
    if (!code) return "";
    return convertToThreeCharLocale(code) ?? code.toLowerCase();
};

const readInitForLocale = (init: unknown, anyCode: string): string => {
    if (!init || typeof init !== "object") return "";
    const bag = init as Record<string, unknown>;
    const three = toThree(anyCode); // e.g., "ara"
    const two = toTwo(anyCode);     // e.g., "ar"
    const pick = (k?: string): string =>
        k && typeof bag[k] === "string" ? (bag[k] as string) : "";
    return pick(three) || pick(two) || pick(anyCode);
};

/* ------------------------------------------------------------------ */

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isRequired?: boolean;
    toggleLocale?: (direction?: "next" | "prev") => void;
    formLocale?: string;
    initValue?: string | number | readonly string[] | undefined | Record<string, unknown>;
    name: string;
    id?: string;
    placeholder?: string;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    alwaysLTR?: boolean;
    error?: RHFFieldError | undefined;
    label?: string;
    onChange?: ChangeEventHandler<HTMLInputElement> | undefined;

    // translation injection (for required tooltip only)
    t?: (key: string) => string;

    // language config injection (for multi-language behavior)
    languages?: LanguageConfig[];

    // stacked mode
    stackedLocaleView?: boolean;
    stackedLocales?: string[]; // e.g. ["ara","eng"] or ["ar","en"]
    localeFieldLabels?: Partial<Record<string, string>>;
    placeholdersByLocale?: Partial<Record<string, string>>;

    /** Live sanitizing (without changing native `type`) */
    sanitizeAs?: "phone";
    /** Fine-tune phone sanitizing when sanitizeAs="phone" */
    phoneOptions?: SanitizePhoneOptions;
}

const CInputInner = forwardRef<HTMLInputElement, TextInputProps>(
    (
        {
            isRequired = false,
            toggleLocale,
            formLocale,
            disabled = false,
            initValue,
            description,
            tipText,
            alwaysLTR = false,
            type = "text",
            name,
            id,
            placeholder,
            className,
            error,
            label,
            onChange,
            t,
            languages,

            // stacked
            stackedLocaleView = false,
            stackedLocales,
            localeFieldLabels,
            placeholdersByLocale,

            // sanitize
            sanitizeAs,
            phoneOptions,

            // pass-through
            ...rest
        },
        ref
    ) => {
        const inputClassName = `bg-gray-50 dark:bg-gray-700 placeholder:text-xs border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-gray-500 ${className ?? ""}`;

        const phoneLike = sanitizeAs === "phone";
        const lockLTR = alwaysLTR || phoneLike;

        /* ===================== single-field (default) ===================== */
        const [isVisible, setIsVisible] = useState(false);
        const inputType = isVisible && type === "password" ? "text" : type;

        const [inputValue, setInputValue] = useState<string>("");

        const [dir, setDir] = useState<"ltr" | "rtl">(() => {
            if (!languages || !formLocale) return "ltr";
            const three = toThree(formLocale);
            return three ? (isLanguageRTL(three) ? "rtl" : "ltr") : "ltr";
        });

        const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (lockLTR) {
                setDir("ltr");
                return;
            }
            const value = event.currentTarget.value;
            if (/^[A-Za-z0-9]/.test(value)) setDir("ltr");
            else if (/^[\u0621-\u064A]/.test(value)) setDir("rtl");
        };

        const sanitizeIfNeeded = (e: ChangeEvent<HTMLInputElement>): string => {
            let next = e.currentTarget.value;
            if (phoneLike) {
                const sanitized = toGoodPhone(next, {
                    convertLeadingIdd: ["00", "011"],
                    forcePlus: "auto",
                    stripExtensions: true,
                    clampE164: false,
                    ...(phoneOptions ?? {}),
                });
                if (sanitized !== next) {
                    e.currentTarget.value = sanitized;
                    try {
                        const len = sanitized.length;
                        e.currentTarget.setSelectionRange?.(len, len);
                    } catch { /* noop */
                    }
                    next = sanitized;
                }
            }
            return next;
        };

        const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
            const nextVal = sanitizeIfNeeded(event);
            setInputValue(nextVal);
            onChange?.(event);
        };

        useEffect(() => {
            if (stackedLocaleView) return;
            if (isLocaleObject(initValue) && formLocale) {
                setInputValue(readInitForLocale(initValue, formLocale) || "");
            } else if (typeof initValue === "object" && initValue !== null) {
                setInputValue(initValue.toString() || "");
            } else {
                setInputValue(initValue?.toString() || "");
            }
        }, [formLocale, initValue, stackedLocaleView]);

        useEffect(() => {
            if (!stackedLocaleView && formLocale) {
                if (languages) {
                    const three = toThree(formLocale);
                    setDir(isLanguageRTL(three) ? "rtl" : "ltr");
                } else {
                    setDir("ltr");
                }
            }
        }, [formLocale, stackedLocaleView, languages]);

        /* ===================== stacked view (per-language) ===================== */

        // Languages to render: prop order or config (config returns 3-char codes)
        const locales: string[] = useMemo(
            () => {
                if (stackedLocales && stackedLocales.length > 0) return stackedLocales;
                if (languages && languages.length > 0) return getInputLanguages(languages);
                return [toThree(formLocale) || "eng"];
            },
            [stackedLocales, languages, formLocale]
        );

        const requiredSet = useMemo(
            () => (languages ? new Set(getRequiredInputLanguages(languages)) : new Set<string>()),
            [languages]
        );

        // UI state for visible inputs (keys use 2-char for local state)
        const buildInitialMap = (): Record<string, string> => {
            const map: Record<string, string> = {};
            if (isLocaleObject(initValue)) {
                for (const loc of locales) {
                    map[toTwo(loc)] = readInitForLocale(initValue, loc);
                }
            } else {
                const asStr = initValue != null ? String(initValue) : "";
                const target2 = toTwo(formLocale || locales[0] || "en") || "en";
                for (const loc of locales) {
                    const vk2 = toTwo(loc);
                    map[vk2] = vk2 === target2 ? asStr : "";
                }
            }
            return map;
        };

        const [stackValues, setStackValues] = useState<Record<string, string>>(buildInitialMap);

        useEffect(() => {
            if (!stackedLocaleView) return;
            setStackValues(buildInitialMap());
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initValue, formLocale, stackedLocaleView, locales.join("|")]);

        /* ============================= render ============================== */

        if (stackedLocaleView) {
            return (
                <div>
                    {label && (
                        <label
                            htmlFor={id}
                            className="mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
                        >
                            <div>
                                {label}
                                {isRequired && t && <RequiredAsterisk t={t}/>}
                                {tipText && <TooltipIcon tipText={tipText}/>}
                            </div>
                            {/* no toggle in stacked mode */}
                        </label>
                    )}

                    <div className="space-y-2">
                        {locales.map((locRaw) => {
                            const cfgCode = toThree(locRaw); // "ara" / "eng" (3-char)
                            const valKey2 = toTwo(locRaw);   // "ar" / "en" (2-char for local state/labels)
                            const isRtl = languages ? isLanguageRTL(cfgCode) : false;
                            const small =
                                (localeFieldLabels && (localeFieldLabels[locRaw] ?? localeFieldLabels[valKey2])) ||
                                (label ? `${label} (${(valKey2 || cfgCode).toUpperCase()})` : (valKey2 || cfgCode).toUpperCase());
                            const plc =
                                (placeholdersByLocale &&
                                    (placeholdersByLocale[locRaw] ?? placeholdersByLocale[valKey2])) ||
                                placeholder ||
                                "";
                            const perLocaleRequired = requiredSet.has(cfgCode);

                            const onStackedChange = (e: ChangeEvent<HTMLInputElement>) => {
                                const sanitized = sanitizeIfNeeded(e);
                                setStackValues((prev) => ({...prev, [valKey2]: sanitized}));
                                onChange?.(e); // keep handleInputChange path
                            };

                            return (
                                <div key={locRaw}>
                                    <div
                                        className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        <span>{small}</span>
                                        {perLocaleRequired && t && <RequiredAsterisk t={t}/>}
                                    </div>
                                    <input
                                        {...rest}
                                        value={stackValues[valKey2] ?? ""}
                                        dir={lockLTR ? "ltr" : isRtl ? "rtl" : "ltr"}
                                        type={type === "password" ? "text" : type}
                                        step="any"
                                        // name pattern `name[locale]` (3-char) integrates with your hook.
                                        name={`${name}[${cfgCode}]`} // e.g., "name[ara]" / "name[eng]"
                                        id={id ? `${id}__${valKey2 || cfgCode}` : undefined}
                                        placeholder={plc}
                                        className={inputClassName}
                                        disabled={disabled}
                                        onChange={onStackedChange}
                                        // phone UX hints
                                        inputMode={phoneLike ? "tel" : rest.inputMode}
                                        autoComplete={phoneLike ? "tel" : rest.autoComplete}
                                        lang="en-US"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {description && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
                    )}
                    <FormError error={error}/>
                </div>
            );
        }

        // single-field (default)
        return (
            <div>
                <>
                    {label && (
                        <label
                            htmlFor={id}
                            className=" mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between"
                        >
                            <div>
                                {label}
                                {isRequired && t && <RequiredAsterisk t={t}/>}
                                {tipText && <TooltipIcon tipText={tipText}/>}
                            </div>
                            {toggleLocale && (
                                <span
                                    onClick={() => toggleLocale()}
                                    className="ml-2 text-primary-600 cursor-pointer rounded-full bg-black text-white dark:bg-white dark:text-black px-2 py-1 uppercase"
                                >
                  {formLocale}
                </span>
                            )}
                        </label>
                    )}
                    <div className="relative">
                        <input
                            {...rest}
                            value={inputValue}
                            dir={lockLTR ? "ltr" : inputValue?.toString().length ? dir : undefined}
                            onKeyUp={handleKeyUp}
                            ref={ref}
                            type={inputType}
                            step="any"
                            name={name}
                            id={id}
                            placeholder={placeholder}
                            className={inputClassName}
                            disabled={disabled}
                            onChange={handleChange}
                            // phone UX hints
                            inputMode={phoneLike ? "tel" : rest.inputMode}
                            autoComplete={phoneLike ? "tel" : rest.autoComplete}
                            lang="en-US"
                        />
                        {type === "password" && (
                            <div
                                onClick={() => setIsVisible(!isVisible)}
                                className={`absolute inset-y-0 ${dir === "ltr" ? "right-0" : "left-0"} pr-3 flex items-center cursor-pointer`}
                            >
                                {isVisible ? (
                                    <EyeIcon className="w-5 h-5 text-gray-600"/>
                                ) : (
                                    <EyeSlashIcon className="w-5 h-5 text-gray-500"/>
                                )}
                            </div>
                        )}
                    </div>
                    {description && (
                        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
                    )}
                    <FormError error={error}/>
                </>
            </div>
        );
    }
);

CInputInner.displayName = "CInput";

export const CInput = CInputInner;
