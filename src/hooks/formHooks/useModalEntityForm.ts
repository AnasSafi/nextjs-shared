"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type React from "react";
import {createUseModalForm} from "./useModalForm";
import {createUseFormInput} from "./useFormInput";
import {createUseFormLocale} from "./useFormLocale";
import type {TranslateFn} from "../../models/core/localeModels";
import {UseFormFunctionModel} from "../../models/ui/modalModels";
import {FormPropsModel, FormRefModel} from "../../models/core/formModels";
import {LanguageConfig} from "../../i18n/languageConfigUtils";

type SelectId<PropsData> = (data: PropsData | undefined) => string | number | null | undefined;

type UseModalEntityFormOptions<
    Req extends object,
    Server,
    ListItem,
    PropsData
> = {
    ref: React.ForwardedRef<FormRefModel>;
    props: FormPropsModel<PropsData, ListItem>;
    emptyStateAction: () => Req;
    fetcherAction: (id?: string) => Promise<Server | null>;
    toRequestAction: (server: Server | null) => Req;
    saveHookAction: UseFormFunctionModel<Req, PropsData, ListItem> | undefined;
    selectIdAction?: SelectId<PropsData>;
    blockWhileFetchingIfHasId?: boolean;
};

export type UseTranslationHook = () => {
    t: TranslateFn;
    currentLng?: string | null;
};

export function createUseModalEntityForm(args: {
    languages: LanguageConfig[];
    defaultLng: string;
    useTranslationHook: UseTranslationHook;
}) {
    const {languages, defaultLng, useTranslationHook} = args;

    const useModalForm = createUseModalForm(useTranslationHook);
    const useFormInput = createUseFormInput(languages);
    const useFormLocale = createUseFormLocale({
        languages,
        defaultLng,
        useTranslationHook,
    });

    return function useModalEntityForm<
        Req extends object,
        Server = unknown,
        ListItem = unknown,
        PropsData = unknown
    >(opts: UseModalEntityFormOptions<Req, Server, ListItem, PropsData>) {
        const {
            ref,
            props,
            emptyStateAction,
            fetcherAction,
            toRequestAction,
            saveHookAction,
            selectIdAction,
        } = opts;

        const defaultSelectId: SelectId<PropsData> = useCallback<SelectId<PropsData>>((data) => {
            if (!data || typeof data !== "object") return undefined;
            const rec = data as Record<string, unknown>;
            const idVal = rec["id"];
            const userIdVal = rec["userId"];
            if (typeof idVal === "string") return idVal;
            if (typeof userIdVal === "string") return userIdVal;
            if (typeof idVal === "number") return idVal;
            if (typeof userIdVal === "number") return userIdVal;
            return undefined;
        }, []);

        const pickId: SelectId<PropsData> = selectIdAction ?? defaultSelectId;

        const id: string | undefined = useMemo<string | undefined>(() => {
            const v: string | number | null | undefined = pickId(props?.data);

            if (typeof v === "string") {
                const trimmed = v.trim();
                return trimmed.length > 0 ? trimmed : undefined;
            }

            if (typeof v === "number") {
                return Number.isFinite(v) ? String(v) : undefined;
            }

            return undefined;
        }, [pickId, props?.data]);

        const {formLocale, toggle} = useFormLocale();
        const {state: bodyData, handleInputChange, setBodyData, isDirty} = useFormInput<Req>(
            emptyStateAction(),
            formLocale,
        );

        const closeWithData = useMemo(
            () =>
                props.closeModalWithData ??
                ((value: ListItem) => {
                    void value;
                }),
            [props.closeModalWithData],
        );

        const {t, inProgress, setInProgress, register, errors, onSubmit, requiredFields} = useModalForm<
            Req,
            PropsData,
            ListItem
        >({
            ref,
            props,
            bodyData,
            isDirty,
            closeModalWithData: closeWithData,
            useFormFunction: saveHookAction,
        });

        const [data, setData] = useState<Server | null>(null);
        const [loading, setLoading] = useState<boolean>(true);
        const [refreshKey, setRefreshKey] = useState<number>(0);

        const fetcherRef = useRef(fetcherAction);
        const toRequestRef = useRef(toRequestAction);
        const emptyStateRef = useRef(emptyStateAction);

        useEffect(() => {
            fetcherRef.current = fetcherAction;
        }, [fetcherAction]);

        useEffect(() => {
            toRequestRef.current = toRequestAction;
        }, [toRequestAction]);

        useEffect(() => {
            emptyStateRef.current = emptyStateAction;
        }, [emptyStateAction]);

        useEffect(() => {
            if (!id) {
                setBodyData(emptyStateRef.current());
            }
        }, [id, setBodyData]);

        useEffect(() => {
            let cancelled = false;
            setLoading(true);

            const run = async (): Promise<void> => {
                try {
                    const res = await fetcherRef.current(id);
                    if (cancelled) return;

                    setData(res ?? null);

                    const next = toRequestRef.current(res ?? null);
                    setBodyData(next);
                } catch (e) {
                    if (!cancelled) {
                        console.error("useModalEntityForm.fetcherAction error:", e);
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
            };

            void run();

            return () => {
                cancelled = true;
            };
        }, [id, refreshKey, setBodyData]);

        const reload: () => void = useCallback(() => setRefreshKey((k) => k + 1), []);

        const isRequired = useCallback(
            (name: keyof Req | string): boolean => {
                const stripArraySuffix = (key: string): string => (key.endsWith("[]") ? key.slice(0, -2) : key);
                const normalized: string = stripArraySuffix(String(name));
                return (requiredFields as Array<keyof Req>).some((k) => String(k) === normalized);
            },
            [requiredFields],
        );

        const ready: boolean = !loading;

        return {
            t,
            inProgress,
            setInProgress,
            register,
            errors,
            onSubmit,
            requiredFields,
            isRequired,
            formLocale,
            toggle,
            bodyData,
            handleInputChange,
            setBodyData,
            data,
            id,
            loading,
            ready,
            reload,
        };
    };
}
