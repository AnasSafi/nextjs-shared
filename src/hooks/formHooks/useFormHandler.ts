"use client";

import * as yup from "yup";
import type {AnyObject, AnySchema, ObjectSchema} from "yup";
import {
    type BaseSyntheticEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {usePathname, useRouter} from "next/navigation";
import type {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
    type FieldErrors,
    type FieldValues,
    type Path,
    type UseFormRegister,
    type UseFormTrigger,
    useForm,
} from "react-hook-form";

import type {TranslateFn} from "../../models/core/localeModels";

import {useErrorMessageModalActions} from "../modalHooks/useErrorMessageModalActions";
import {useLoaderStore} from "../../store/loaderStore";
import {extractRequiredFields} from "../../utils/validationUtils";
import {createTranslationInputName} from "../../utils/translationUtils";
import {UseFormHandlerProps} from "../../models/core/formHandlerModels";
import {ServerErrorModel, ServerSuccessModel} from "../../models/core/formModels";
import {FetchError} from "../../extensions/FetchError";

/** ===== CONFIG ===== */
const DEBUG_FORM = false;
type LiveValidationMode = "none" | "onBlur" | "debounced" | "onChange";
const LIVE_VALIDATION_MODE: LiveValidationMode = "onChange";
const LIVE_DEBOUNCE_MS = 300;
const LIVE_ABORT_EARLY = true;

const dbg =
    DEBUG_FORM
        ? (...args: ReadonlyArray<unknown>) => console.log("[useFormHandler]", ...args)
        : () => {
        };

/** Helpers to avoid constant-condition TS warnings */
const PASSIVE_MODES: ReadonlyArray<LiveValidationMode> = ["none", "onBlur"] as const;
const isPassiveMode = (m: LiveValidationMode) => PASSIVE_MODES.includes(m);
const isOnBlurMode = (m: LiveValidationMode) => m === "onBlur";
const isDebouncedMode = (m: LiveValidationMode) => m === "debounced";

/** ===== Helpers ===== */
const TRAILING_SLASH_RE: RegExp = /\/+$/;
const stripTrailingSlash = (p: string): string => (p === "/" ? "/" : p.replace(TRAILING_SLASH_RE, ""));
const normalizeForCompare = (pathname: string | null): string | null =>
    pathname ? stripTrailingSlash(pathname) : null;

function resolvePathnameAgainstWindow(target: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        const url: URL = new URL(target, window.location.href);
        return url.pathname;
    } catch {
        return null;
    }
}

function normalizeDynamicArrayField<TValues extends FieldValues>(fieldPath: string, data: TValues): string {
    const match: RegExpMatchArray | null = fieldPath.match(/(.+)\[(\d+)]/);
    if (!match) return fieldPath;
    const collection: string = match[1] ?? "";
    const index: number = Number(match[2] ?? -1);
    const record = data as unknown as Record<string, unknown>;
    const originalArray: unknown = record[collection];
    if (Array.isArray(originalArray) && index >= 0 && index < originalArray.length) {
        const item: unknown = originalArray[index];
        if (item && typeof item === "object" && "id" in (item as Record<string, unknown>)) {
            const foundId: string = String((item as Record<string, unknown>).id);
            return `${collection}*${foundId}`;
        }
    }
    return fieldPath;
}

/** ===== Validation error items (for modal) ===== */
type ValidationErrorItem = {
    field?: string;
    message: string;
};

function uniqValidationItems(items: ValidationErrorItem[]): ValidationErrorItem[] {
    const seen = new Set<string>();
    const out: ValidationErrorItem[] = [];
    for (const it of items) {
        const key = `${it.field ?? ""}::${it.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
    }
    return out;
}

function safeCssEscape(value: string): string {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
    // Fallback: good enough for simple field names; avoids throwing on quotes/backslashes.
    return value.replace(/["\\]/g, "\\$&");
}

function isFieldInDom(field?: string): boolean {
    if (!field) return false;
    if (typeof document === "undefined") return false;
    try {
        return Boolean(document.querySelector(`[name="${safeCssEscape(field)}"]`));
    } catch {
        return false;
    }
}

function pickHiddenOrAll(items: ValidationErrorItem[]): ValidationErrorItem[] {
    // Prefer errors that are not currently rendered in the DOM (hidden/unmounted fields)
    const hidden = items.filter((it) => !isFieldInDom(it.field));
    return hidden.length > 0 ? hidden : items;
}

/** Shallow diff for top-level keys */
function diffTopLevelKeys<T extends Record<string, unknown>>(
    prevObj: T | null,
    nextObj: T | null,
): { added: string[]; removed: string[]; changed: string[] } {
    const prevKeys = new Set<string>(Object.keys(prevObj ?? {}));
    const nextKeys = new Set<string>(Object.keys(nextObj ?? {}));
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    for (const k of nextKeys) {
        if (!prevKeys.has(k)) added.push(k);
        else if ((prevObj as Record<string, unknown>)[k] !== (nextObj as Record<string, unknown>)[k]) changed.push(k);
    }
    for (const k of prevKeys) {
        if (!nextKeys.has(k)) removed.push(k);
    }
    return {added, removed, changed};
}

/** ===== Types for server validation mapping ===== */
interface ServerValidationErrorDetail {
    type?: string;
    message?: string;
}

type ServerValidationErrors<TFields extends FieldValues> = Partial<
    Record<keyof TFields | string, ServerValidationErrorDetail | undefined>
>;

/** Top-level field schemas (map once) */
type YupAnySchema = AnySchema;
type YupObj = ObjectSchema<AnyObject>;

function topLevelFieldSchemas(schema: YupObj): Record<string, YupAnySchema> {
    const maybe = schema as unknown as { fields?: Record<string, YupAnySchema> };
    return maybe.fields ?? {};
}

export type UseTranslationHook = () => { t: TranslateFn };

/**
 * Minimal fetch util shape to avoid coupling to consumer wrappers.
 * Consumer can pass their typed SharedFetchUtil directly; it is compatible structurally.
 */
export type FetchUtilLike = <TRes = unknown>(args: {
    path: string;
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
}) => Promise<TRes>;

export function createUseFormHandler(args: {
    useTranslationHook: UseTranslationHook;
    fetchUtil: FetchUtilLike;
}) {
    const {useTranslationHook, fetchUtil} = args;

    return function useFormHandler<TValues extends FieldValues, TSuccess>(
        {
            keepInProgressOnSuccess = false,
            setInProgress,
            path,
            method = "POST",
            validationSchema,
            onSuccess,
            onError,
            bodyData,
        }: UseFormHandlerProps<TValues, TSuccess>) {
        const router: AppRouterInstance = useRouter();
        const pathname: string = usePathname();
        const {t} = useTranslationHook();
        const {openErrorMessageModal} = useErrorMessageModalActions(t);
        const {setLoading} = useLoaderStore();

        /** DEBUG: init */
        useEffect(() => {
            const targetPathname = resolvePathnameAgainstWindow(path);
            const currentPathname = typeof window !== "undefined" ? window.location.pathname : pathname ?? null;
            dbg("init", {
                method,
                path,
                targetPathname,
                currentPathname,
                normalizedEqual: normalizeForCompare(targetPathname) === normalizeForCompare(currentPathname),
            });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        /** Prevent duplicate submissions + cancel in-flight */
        const submittingRef: RefObject<boolean> = useRef<boolean>(false);
        const abortControllerRef: RefObject<AbortController | null> = useRef<AbortController | null>(null);

        /** Live validation control */
        const [firstSubmission, setFirstSubmission] = useState<boolean>(false);
        const prevBodyRef = useRef<TValues | null>(null);

        /** RHF just to manage error bag + register */
        const {
            register,
            formState: {errors},
            trigger,
            setError,
            clearErrors,
            reset,
        } = useForm<TValues>({});

        /** Pre-map top-level field schemas */
        const fieldSchemas = useMemo(
            () => topLevelFieldSchemas(validationSchema as unknown as YupObj),
            [validationSchema],
        );

        /** Full form validation (on submit) */
        const validateBodyData = useCallback(
            async (data: TValues): Promise<{ isValid: boolean; items: ValidationErrorItem[] }> => {
                const start = performance.now();
                dbg("validate:start", {firstSubmission, keys: Object.keys(data ?? {})});
                try {
                    clearErrors();
                    await (validationSchema as yup.ObjectSchema<TValues>).validate(data, {
                        context: {t, translateFieldName: createTranslationInputName(t)},
                        abortEarly: false,
                    });
                    dbg("validate:end", {ok: true, durationMs: Math.round(performance.now() - start)});
                    return { isValid: true, items: [] };
                } catch (error: unknown) {
                    const items: ValidationErrorItem[] = [];
                    let setCount = 0;
                    if (error instanceof yup.ValidationError) {
                        const pushItem = (path: string | undefined, message: string) => {
                            const normalized = path ? normalizeDynamicArrayField(path, data) : "";
                            const rootKey = normalized ? normalized.split(".")[0] : undefined;
                            items.push({ field: rootKey, message });
                        };

                        if (Array.isArray(error.inner) && error.inner.length > 0) {
                            for (const err of error.inner) {
                                if (!err.message) continue;

                                pushItem(err.path, err.message);

                                let fieldName: string = err.path ?? "";
                                if (!fieldName) continue;
                                fieldName = normalizeDynamicArrayField(fieldName, data);
                                const inputName = fieldName.split(".")[0] as Path<TValues>;
                                setError(inputName, {type: "manual", message: err.message});
                                setCount++;
                                dbg("validate:field", {field: String(inputName), message: err.message});
                            }
                        } else if (error.path) {
                            pushItem(error.path, error.message);
                            const rootKey = error.path.split(".")[0] as Path<TValues>;
                            setError(rootKey, {type: error.type ?? "manual", message: error.message});
                            setCount++;
                            dbg("validate:field", {field: String(rootKey), message: error.message});
                        }
                    }
                    const uniqItems = uniqValidationItems(items);
                    dbg("validate:end", {
                        ok: false,
                        durationMs: Math.round(performance.now() - start),
                        setErrorCount: setCount,
                    });
                    return { isValid: false, items: uniqItems };
                }
            },
            [validationSchema, setError, clearErrors, t, firstSubmission],
        );

        /** Field-level validation (for live checks) */
        const validateField = useCallback(
            async (topLevelKey: string, data: TValues): Promise<void> => {
                if (!(topLevelKey in fieldSchemas)) return;

                try {
                    await (validationSchema as yup.ObjectSchema<TValues>).validateAt(
                        topLevelKey,
                        data,
                        {
                            context: {t, translateFieldName: createTranslationInputName(t)},
                            abortEarly: LIVE_ABORT_EARLY,
                        },
                    );
                    clearErrors(topLevelKey as Path<TValues>);
                } catch (e) {
                    const err = e as yup.ValidationError;
                    setError(topLevelKey as Path<TValues>, {type: err.type ?? "manual", message: err.message});
                    dbg("validate:field", {field: topLevelKey, message: err.message});
                }
            },
            [validationSchema, fieldSchemas, clearErrors, setError, t],
        );

        /** Live validation effect — configurable */
        const debounceRef = useRef<number | null>(null);
        useEffect(() => {
            if (!firstSubmission) {
                prevBodyRef.current = bodyData;
                return;
            }

            if (isPassiveMode(LIVE_VALIDATION_MODE)) {
                prevBodyRef.current = bodyData;
                return;
            }

            const diff = diffTopLevelKeys(
                (prevBodyRef.current as unknown as Record<string, unknown>) ?? null,
                (bodyData as unknown as Record<string, unknown>) ?? null,
            );
            const changedTopLevel = [...diff.added, ...diff.changed, ...diff.removed];
            if (changedTopLevel.length === 0) {
                prevBodyRef.current = bodyData;
                return;
            }

            const run = () => {
                for (const key of changedTopLevel) {
                    void validateField(key, bodyData);
                }
                prevBodyRef.current = bodyData;
            };

            if (isDebouncedMode(LIVE_VALIDATION_MODE)) {
                if (debounceRef.current) window.clearTimeout(debounceRef.current);
                debounceRef.current = window.setTimeout(run, LIVE_DEBOUNCE_MS) as unknown as number;
                return () => {
                    if (debounceRef.current) window.clearTimeout(debounceRef.current);
                };
            }

            run();
        }, [bodyData, firstSubmission, validateField]);

        /** For inputs: call this onBlur to validate a single top-level field (after first submit) */
        const onBlurValidateField = useCallback(
            (name: string) => {
                if (!firstSubmission) return;
                if (!isOnBlurMode(LIVE_VALIDATION_MODE)) return;
                void validateField(name, bodyData);
            },
            [bodyData, firstSubmission, validateField],
        );

        /** Prevent self POST (Next.js RSC loops) */
        const isSelfPost = useCallback((): boolean => {
            const targetPathname: string | null = resolvePathnameAgainstWindow(path);
            const currentPathname: string | null =
                typeof window !== "undefined" ? window.location.pathname : pathname ?? null;

            const same =
                Boolean(targetPathname && currentPathname) &&
                normalizeForCompare(targetPathname) === normalizeForCompare(currentPathname);

            dbg("check:isSelfPost", {targetPathname, currentPathname, same});
            return same;
        }, [path, pathname]);

        /** Submit */
        const onSubmit = useCallback(
            async (event?: BaseSyntheticEvent): Promise<void> => {
                dbg("submit:start");
                setInProgress(true);
                event?.preventDefault?.();
                event?.stopPropagation?.();

                if (submittingRef.current) {
                    dbg("submit:blocked (already submitting)");
                    return;
                }

                if (isSelfPost()) {
                    dbg("submit:blocked (isSelfPost=true)");
                    openErrorMessageModal({
                        title: t("validationErrorTitle"),
                        message: t("formSubmissionErrorMessage"),
                    });
                    setInProgress(false);
                    return;
                }

                submittingRef.current = true;
                setFirstSubmission(true);

                const validation = await validateBodyData(bodyData);
                dbg("submit:afterValidate", {isValid: validation.isValid});

                if (!validation.isValid) {
                    const itemsForModal = pickHiddenOrAll(validation.items);
                    openErrorMessageModal({
                        title: t("validationErrorTitle"),
                        message: t("formSubmissionErrorMessage"),
                        validationErrors: itemsForModal.length > 0 ? itemsForModal : undefined,
                    });
                    submittingRef.current = false;
                    setInProgress(false);
                    dbg("submit:exit (invalid)");
                    return;
                }

                if (abortControllerRef.current) {
                    dbg("fetch:abortPrevious");
                    abortControllerRef.current.abort();
                }
                const controller = new AbortController();
                abortControllerRef.current = controller;

                let processedSuccess = false;

                try {
                    dbg("fetch:start", {path, method});
                    const serverSuccess: ServerSuccessModel<TSuccess> =
                        await fetchUtil<ServerSuccessModel<TSuccess>>({
                            path,
                            method,
                            body: bodyData,
                            signal: controller.signal,
                        });

                    processedSuccess = true;
                    dbg("fetch:success", {
                        redirect: serverSuccess?.success?.redirect?.path ?? null,
                        hasData: Boolean(serverSuccess?.success?.data),
                    });

                    if (onSuccess) {
                        await onSuccess(serverSuccess);
                        dbg("onSuccess:done");
                    }

                    if (!keepInProgressOnSuccess) setInProgress(false);

                    const redirectPath: string | undefined = serverSuccess?.success?.redirect?.path;
                    if (redirectPath) {
                        dbg("redirect:assign", {redirectPath});
                        setLoading(true);
                        if (typeof window !== "undefined") {
                            window.location.assign(redirectPath);
                        } else {
                            router.replace(redirectPath);
                        }
                    }
                } catch (err: unknown) {
                    dbg("fetch:error", {
                        errName: err instanceof Error ? err.name : "unknown",
                        isAbort: err instanceof DOMException && (err as DOMException).name === "AbortError",
                        isFetchError: err instanceof FetchError,
                    });

                    if (onError) {
                        try {
                            await onError(err);
                            dbg("onError:done");
                        } catch {
                            dbg("onError:thrown (ignored)");
                        }
                    }

                    if (err instanceof DOMException && err.name === "AbortError") {
                        dbg("fetch:aborted");
                    } else if (err instanceof FetchError) {
                        const serverError: ServerErrorModel | undefined = err.serverError;
                        if (serverError) {
                            dbg("server:error", {
                                title: serverError.error.title ?? "",
                                hasValidation: Boolean(serverError.error.validationErrors),
                            });

                            const validationErrors =
                                serverError.error.validationErrors as ServerValidationErrors<TValues> | undefined;

                            const serverItems: ValidationErrorItem[] = validationErrors
                                ? uniqValidationItems(
                                    Object.keys(validationErrors)
                                        .map((fieldName) => {
                                            const fieldErr = validationErrors[fieldName];
                                            const root = fieldName.split(".")[0];
                                            return { field: root, message: fieldErr?.message ?? "" };
                                        })
                                        .filter((x) => x.message && x.message.trim().length > 0),
                                )
                                : [];

                            openErrorMessageModal({
                                title: serverError.error.title ?? "",
                                message: serverError.error.message ?? "",
                                validationErrors: serverItems.length > 0 ? pickHiddenOrAll(serverItems) : undefined,
                            });

                            if (validationErrors) {
                                const keys = Object.keys(validationErrors);
                                dbg("server:validationErrors", {count: keys.length, keys});

                                keys.forEach((fieldName) => {
                                    const fieldErr = validationErrors[fieldName];
                                    const inputName = fieldName.split(".")[0] as Path<TValues>;
                                    setError(inputName, {
                                        type: (fieldErr?.type ?? "server") as string,
                                        message: fieldErr?.message,
                                    });
                                    dbg("server:setError", {
                                        field: String(inputName),
                                        message: fieldErr?.message ?? "",
                                    });
                                });
                            }
                        }
                    } else {
                        openErrorMessageModal({
                            title: t("connectionError"),
                            message: t("connectionErrorMessage"),
                        });
                    }
                } finally {
                    const shouldUnset = !processedSuccess || (processedSuccess && !keepInProgressOnSuccess);
                    if (shouldUnset) setInProgress(false);

                    submittingRef.current = false;
                    if (abortControllerRef.current === controller) abortControllerRef.current = null;
                    dbg("submit:finally", {processedSuccess, keepInProgressOnSuccess});
                }
            },
            [
                isSelfPost,
                validateBodyData,
                bodyData,
                path,
                method,
                setInProgress,
                keepInProgressOnSuccess,
                openErrorMessageModal,
                onSuccess,
                onError,
                router,
                setLoading,
            ],
        );

        /** Abort on unmount */
        useEffect(() => {
            return () => {
                if (abortControllerRef.current) {
                    dbg("cleanup:abortController");
                    abortControllerRef.current.abort();
                }
                dbg("cleanup:unmount");
            };
        }, []);

        /** Cache required fields once */
        const requiredFields = useMemo(
            () => extractRequiredFields(validationSchema as yup.ObjectSchema<TValues>) as Array<keyof TValues>,
            [validationSchema],
        );

        /** Clears RHF errors/flags after success/external reset */
        const resetFormState = useCallback((): void => {
            clearErrors();
            reset(undefined, {
                keepErrors: false,
                keepDirty: false,
                keepTouched: false,
                keepIsSubmitted: false,
                keepSubmitCount: false,
                keepValues: false,
            });
            setFirstSubmission(false);
            prevBodyRef.current = null;
        }, [clearErrors, reset]);

        return {
            register: register as UseFormRegister<TValues>,
            errors: errors as FieldErrors<TValues>,
            onSubmit,
            trigger: trigger as UseFormTrigger<TValues>,
            requiredFields,
            onBlurValidateField,
            resetFormState,
        };
    };
}
