"use client";

import React, {forwardRef, type JSX, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import clsx from "clsx";
import {ArchiveBoxXMarkIcon} from "@heroicons/react/24/outline";
import type {FieldValues} from "react-hook-form";
import type {PaginationModel, SelectOptionModel} from "../../models/core/dbModels";
import {RHFErrorCompat} from "../../models/core/formModels";
import {composeRefs, getOptionLabelFactory, getPrimaryLabelFactory, normalizeForSearch} from "./Helpers/ComboboxShared";
import {mapKeysToThreeCharLocales} from "../../i18n/localeMaps";
import {MultiLangValue} from "../../models/core/localeModels";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import OptionList from "./OptionList";
import {FormError} from "./Helpers/FormError";

export type BaseVariant = "single" | "multiple";

type PathBuilder = string | ((opt: SelectOptionModel) => string);

export type BaseComboBoxInjected = {
    t: (key: string, vars?: Record<string, any>) => string;
    currentLng: string;

    useComboCore: (config: {
        pagination?: PaginationModel | null;
        initialData?: SelectOptionModel[];
        getLabel: (opt: SelectOptionModel) => string;
        setParentInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
        dropdownStrategy?: "inline" | "fixed";
        disabled?: boolean;
        autoOpenOnType?: boolean;
    }) => {
        inputRef: React.RefObject<HTMLInputElement | null>;
        listRef: React.RefObject<HTMLUListElement | null>;
        anchorRef: React.RefObject<HTMLDivElement | null>;
        isOpen: boolean;
        open: () => void;
        close: () => void;
        inProgress: boolean;
        options: SelectOptionModel[];
        inputValue: string;
        setInputValue: React.Dispatch<React.SetStateAction<string>>;
        onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onScroll: (e: React.UIEvent<HTMLUListElement>) => void;
        fixedStyle?: React.CSSProperties;
        resetDatasource: (
            search?: string,
            opts?: {preserveScroll?: boolean; keepInputValue?: boolean; openAfterFetch?: boolean}
        ) => void;
        insertOption: (opt: SelectOptionModel) => void;
        replaceOption: (opt: SelectOptionModel) => void;
        removeOptionById: (id: string) => void;
        listboxId: string;
    };

    openCreateOptionModal?: (args: {
        apiPath: string;
        prefillName?: string;
        extraBody?: Record<string, unknown>;
        mapSuccessToOption?: (serverData: unknown) => SelectOptionModel;
    }) => Promise<SelectOptionModel | null | undefined>;

    openEditOptionModal?: (args: {
        apiPath: string;
        option: SelectOptionModel;
        extraBody?: Record<string, unknown>;
        mapSuccessToOption?: (serverData: unknown, prev: SelectOptionModel) => SelectOptionModel;
    }) => Promise<SelectOptionModel | null | undefined>;

    fetchUtil?: <T = unknown>(opts: {
        path: string;
        method: string;
        body?: unknown;
    }) => Promise<T>;
};

export interface BaseComboBoxProps<TFormValues extends FieldValues = FieldValues> {
    variant: BaseVariant;
    matchId?: string | null;
    setParentInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
    isRequired?: boolean;
    /** For single-select (pass undefined if you don't want to force-init). */
    initValueSingle?: SelectOptionModel | null;
    /** For multi-select (pass undefined if you don't want to force-init). */
    initValueMultiple?: SelectOptionModel[];
    name: string;
    type?: string;
    id?: string;
    placeholder?: string | null;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    error?: RHFErrorCompat<TFormValues>;
    label?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    pagination?: PaginationModel | null;
    imageForSelectedOnly?: boolean;
    refreshCompoList?: (administrativeDivisionIs: string, newChildValue: string) => void;
    dropdownStrategy?: "inline" | "fixed";

    /** Create-new (generic modal) */
    createApiPath?: string;
    createActionLabel?: string;
    createMapSuccessToOption?: (serverData: unknown) => SelectOptionModel;
    createExtraBody?: Record<string, unknown>;

    /** Show all translations in the options list (concatenated) */
    showAllLanguagesInOptions?: boolean;

    /** Custom loader to render inside the dropdown */
    LoaderSlot?: JSX.Element;

    /** Edit/delete flows */
    canEditOptions?: boolean;
    canDeleteOptions?: boolean;

    /** Update/delete wiring (path can be template like "/api/x/:id" or a builder fn) */
    updateApiPath?: PathBuilder;
    deleteApiPath?: PathBuilder;

    /** How to build the update body & map the success payload to option */
    buildUpdateBody?: (
        prev: SelectOptionModel,
        localizedTwoChar: Record<string, string>
    ) => unknown;

    updateMapSuccessToOption?: (
        serverData: unknown,
        prev: SelectOptionModel
    ) => SelectOptionModel;

    /** Optional delete body + confirm message */
    buildDeleteBody?: (opt: SelectOptionModel) => unknown;
    confirmDeleteMessage?: string;
}

function sameOption(
    a: SelectOptionModel | null | undefined,
    b: SelectOptionModel | null | undefined,
): boolean {
    const ai: string | null = a?.id ?? null;
    const bi: string | null = b?.id ?? null;
    return String(ai) === String(bi);
}

function sameByIds(a: SelectOptionModel[] = [], b: SelectOptionModel[] = []): boolean {
    if (a.length !== b.length) return false;
    if (a.length === 0) return true;
    const sa: Set<string> = new Set(a.map((x) => String(x.id)));
    for (const it of b) if (!sa.has(String(it.id))) return false;
    return true;
}

function pathFrom(builder: PathBuilder | undefined, opt: SelectOptionModel): string | null {
    if (!builder) return null;
    if (typeof builder === "function") return builder(opt);
    if (builder.includes(":id")) return builder.replace(":id", encodeURIComponent(opt.id));
    return `${builder}/${encodeURIComponent(opt.id)}`;
}

function BaseComboBoxCoreInner<TFormValues extends FieldValues = FieldValues>(
    props: BaseComboBoxProps<TFormValues> & BaseComboBoxInjected,
    forwardedRef: React.ForwardedRef<HTMLInputElement>,
): JSX.Element {
    const {
        t,
        currentLng,
        useComboCore,
        openCreateOptionModal,
        openEditOptionModal,
        fetchUtil,

        variant,
        setParentInProgress,
        isRequired = false,
        disabled = false,
        initValueSingle,
        initValueMultiple,
        description,
        tipText,
        type = "text",
        name,
        id,
        placeholder,
        className,
        error,
        label,
        onChange,
        pagination = null,
        imageForSelectedOnly = false,
        refreshCompoList,
        dropdownStrategy = "inline",
        createApiPath,
        createActionLabel,
        createMapSuccessToOption,
        createExtraBody,
        showAllLanguagesInOptions = false,
        LoaderSlot,

        canEditOptions = false,
        canDeleteOptions = false,
        updateApiPath,
        deleteApiPath,
        buildDeleteBody,
        confirmDeleteMessage = "Delete this item?",
    } = props;

    const getPrimaryLabel = useMemo(() => getPrimaryLabelFactory(currentLng), [currentLng]);
    const getOptionLabel = useMemo(
        () => getOptionLabelFactory(currentLng, showAllLanguagesInOptions),
        [currentLng, showAllLanguagesInOptions],
    );

    const [selectedSingle, setSelectedSingle] = useState<SelectOptionModel | null>(null);
    const [selectedMulti, setSelectedMulti] = useState<SelectOptionModel[]>([]);

    const {
        inputRef,
        listRef,
        anchorRef,
        isOpen,
        open,
        close,
        inProgress,
        options,
        inputValue,
        setInputValue,
        onInputChange,
        onScroll,
        fixedStyle,
        resetDatasource,
        insertOption,
        replaceOption,
        removeOptionById,
        listboxId,
    } = useComboCore({
        pagination,
        initialData: Array.isArray(pagination?.data) ? (pagination!.data as SelectOptionModel[]) : [],
        getLabel: (o: SelectOptionModel): string => getPrimaryLabel(o),
        setParentInProgress,
        dropdownStrategy,
        disabled,
        autoOpenOnType: true,
    });

    const mergedInputRef = useMemo(
        () => composeRefs<HTMLInputElement>(inputRef, forwardedRef),
        [forwardedRef, inputRef],
    );

    const userPickedRef = useRef(false);
    useEffect(() => {
        userPickedRef.current = false;
    }, [name]);

    const interactingWithListRef = useRef(false);

    useEffect(() => {
        if (typeof initValueSingle === "undefined") return;
        if (userPickedRef.current) return;
        setSelectedSingle((prev) => {
            if (sameOption(prev, initValueSingle)) return prev;
            const next = initValueSingle ?? null;
            setInputValue(next ? getPrimaryLabel(next) : "");
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initValueSingle, getPrimaryLabel]);

    useEffect(() => {
        if (typeof initValueMultiple === "undefined") return;
        if (userPickedRef.current) return;
        const next: SelectOptionModel[] = initValueMultiple ?? [];
        setSelectedMulti((prev) => (sameByIds(prev, next) ? prev : next));
    }, [initValueMultiple]);

    const emitMultiIdsChange = (ids: string[]): void => {
        if (!onChange) return;
        const synthetic: React.ChangeEvent<HTMLInputElement> = {
            // @ts-expect-error minimal target shape
            target: {name, type: "text", value: JSON.stringify(ids), checked: false},
        };
        onChange(synthetic);
    };

    const emitSingleIdChange = (valueId: string): void => {
        if (!onChange) return;
        const synthetic: React.ChangeEvent<HTMLInputElement> = {
            // @ts-expect-error minimal target shape
            target: {name, type: "text", value: valueId, checked: false},
        };
        onChange(synthetic);
    };

    const onPickMulti = (opt: SelectOptionModel): void => {
        userPickedRef.current = true;

        const exists = selectedMulti.some((o) => o.id === opt.id);
        const next = exists ? selectedMulti.filter((o) => o.id !== opt.id) : [...selectedMulti, opt];

        setSelectedMulti(next);
        emitMultiIdsChange(next.map((o) => o.id));

        open();
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        if (refreshCompoList && id) refreshCompoList(id, opt.id);
    };

    const onPickSingle = (opt: SelectOptionModel): void => {
        userPickedRef.current = true;
        setSelectedSingle(opt);
        setInputValue(getPrimaryLabel(opt));
        emitSingleIdChange(opt.id);
        close();
        if (refreshCompoList && id) refreshCompoList(id, opt.id);
    };

    const clearMulti = (): void => {
        if (disabled) return;
        userPickedRef.current = true;
        setSelectedMulti([]);
        setInputValue("");
        emitMultiIdsChange([]);
        resetDatasource("");
        if (refreshCompoList && id) refreshCompoList(id, "");
        open();
    };

    const clearSingle = (): void => {
        if (disabled) return;
        userPickedRef.current = true;
        setSelectedSingle(null);
        setInputValue("");
        emitSingleIdChange("");
        resetDatasource("");
        if (refreshCompoList && id) refreshCompoList(id, "");
    };

    const findExactMatch = (raw: string): SelectOptionModel | null => {
        const needle = normalizeForSearch(raw.trim());
        if (!needle) return null;

        const matches = options.filter((opt) => {
            const labelNorm = normalizeForSearch(getPrimaryLabel(opt));
            if (labelNorm === needle) return true;
            const extras = (opt.searchTexts ?? []) as string[];
            return extras.some((s) => normalizeForSearch(String(s)) === needle);
        });

        if (matches.length === 1) return matches[0];

        const rawExact = matches.filter((opt) => String(getPrimaryLabel(opt)).trim() === raw.trim());
        if (rawExact.length === 1) return rawExact[0];

        return null;
    };

    const handleBlurCommit = (evt: React.FocusEvent<HTMLInputElement>): void => {
        const next = evt.relatedTarget as Node | null;
        const listEl = listRef.current;

        if (listEl && next && listEl.contains(next)) return;

        setTimeout(() => {
            if (interactingWithListRef.current) {
                interactingWithListRef.current = false;
                return;
            }

            const typed = inputValue.trim();

            if (variant === "single") {
                if (typed) {
                    const match = findExactMatch(typed);
                    if (match) {
                        userPickedRef.current = true;
                        setSelectedSingle(match);
                        setInputValue(getPrimaryLabel(match));
                        emitSingleIdChange(match.id);
                        close();
                        if (refreshCompoList && id) refreshCompoList(id, match.id);
                        return;
                    }
                }
                setInputValue(selectedSingle ? getPrimaryLabel(selectedSingle) : "");
                close();
            } else {
                if (typed) {
                    const match = findExactMatch(typed);
                    if (match) {
                        userPickedRef.current = true;
                        const exists = selectedMulti.some((o) => o.id === match.id);
                        if (!exists) {
                            const nextSel = [...selectedMulti, match];
                            setSelectedMulti(nextSel);
                            emitMultiIdsChange(nextSel.map((o) => o.id));
                            if (refreshCompoList && id) refreshCompoList(id, match.id);
                        }
                    }
                }
                setInputValue("");
                close();
            }
        }, 0);
    };

    const handleEditOption = async (opt: SelectOptionModel): Promise<void> => {
        if (disabled || !updateApiPath || !openEditOptionModal) return;

        const url = pathFrom(updateApiPath, opt);
        if (!url) return;

        try {
            setParentInProgress?.(true);

            const updated = await openEditOptionModal({
                apiPath: url,
                option: opt,
                extraBody: createExtraBody,
                mapSuccessToOption: undefined,
            });
            if (!updated) return;

            const normalized: SelectOptionModel = {
                ...opt,
                ...updated,
                name: mapKeysToThreeCharLocales(updated.name as MultiLangValue),
            };

            replaceOption(normalized);

            if (variant === "multiple") {
                const next = selectedMulti.map((s) => (s.id === normalized.id ? normalized : s));
                setSelectedMulti(next);
                emitMultiIdsChange(next.map((o) => o.id));
            } else if (variant === "single") {
                if (selectedSingle?.id === normalized.id) {
                    setSelectedSingle(normalized);
                    setInputValue(getPrimaryLabel(normalized));
                    emitSingleIdChange(normalized.id);
                }
            }
        } catch {
            // ignore
        } finally {
            setParentInProgress?.(false);
        }
    };

    const handleDeleteOption = async (opt: SelectOptionModel): Promise<void> => {
        if (disabled || !deleteApiPath || !fetchUtil) return;
        const ok = window.confirm(confirmDeleteMessage);
        if (!ok) return;

        const url = pathFrom(deleteApiPath, opt);
        if (!url) return;

        try {
            setParentInProgress?.(true);

            await fetchUtil<unknown>({
                path: url,
                method: "DELETE",
                body: buildDeleteBody?.(opt),
            });

            removeOptionById(opt.id);

            if (variant === "multiple") {
                const next = selectedMulti.filter((s) => s.id !== opt.id);
                setSelectedMulti(next);
                emitMultiIdsChange(next.map((o) => o.id));
            } else if (variant === "single") {
                if (selectedSingle?.id === opt.id) {
                    setSelectedSingle(null);
                    setInputValue("");
                    emitSingleIdChange("");
                }
            }
        } finally {
            setParentInProgress?.(false);
        }
    };

    const selectedIds: Set<string> = useMemo(() => {
        return variant === "multiple"
            ? new Set(selectedMulti.map((s) => String(s.id)))
            : new Set(selectedSingle ? [String(selectedSingle.id)] : []);
    }, [variant, selectedMulti, selectedSingle]);

    const handleOpen = (): void => {
        if (disabled) return;
        open();

        if (variant === "single") {
            const selectedLabel: string = selectedSingle ? getPrimaryLabel(selectedSingle).trim() : "";
            const current: string = inputValue.trim();

            if (current === selectedLabel) {
                resetDatasource("", {preserveScroll: true, keepInputValue: true});
            }
        }
    };

    const hasVisibleOptions = options.length > 0;
    const allVisibleSelected = useMemo((): boolean => {
        if (!hasVisibleOptions) return false;
        for (const o of options) {
            if (!selectedIds.has(o.id)) return false;
        }
        return true;
    }, [hasVisibleOptions, options, selectedIds]);

    const bulkActionIsSelect = !allVisibleSelected;

    const inputId: string = id ?? (variant === "multiple" ? "MultiSelectComboBox" : "ComboBox");
    const basePlaceholder: string = (placeholder ?? t("select")) as string;

    const multiPlaceholder: string = useMemo((): string => {
        if (disabled) return basePlaceholder;
        if (inputValue && inputValue.trim().length > 0) return basePlaceholder;

        const count = selectedMulti.length;
        if (count <= 0) return basePlaceholder;

        return count === 1
            ? (t("comboSelectedOne", {count}) as string)
            : (t("comboSelectedMany", {count}) as string);
    }, [disabled, basePlaceholder, inputValue, selectedMulti.length, t]);

    const placeholderText: string = variant === "multiple" ? multiPlaceholder : basePlaceholder;

    const inputClasses: string = clsx(
        "h-10 w-full rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs sm:text-sm sm:leading-6",
        variant === "single" ? "border border-gray-300" : "border-0",
        variant === "single" && selectedSingle?.image ? "ps-10 pe-10" : "px-3",
        disabled ? "ring-0 focus:ring-0" : "ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-amber-500",
    );

    const allowRowActions = Boolean(!disabled && (canEditOptions || canDeleteOptions) && (updateApiPath || deleteApiPath));

    return (
        <div>
            {label && (
                <label
                    className={clsx(
                        "block text-sm font-medium leading-6",
                        disabled ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white",
                    )}
                    htmlFor={inputId}
                >
                    <span className="inline-flex items-center gap-2">
                        {label} {isRequired && <RequiredAsterisk t={t} />}
                        {tipText && <TooltipIcon tipText={tipText} />}
                    </span>
                </label>
            )}

            <div ref={anchorRef} className="relative mt-2">
                {variant === "single" && selectedSingle?.image && (
                    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                        <Image width={20} height={20} src={selectedSingle.image} alt="" className="h-5 w-5" />
                    </div>
                )}

                <input
                    ref={mergedInputRef}
                    id={inputId}
                    name={name}
                    type={type}
                    autoComplete="off"
                    readOnly={disabled}
                    value={inputValue}
                    placeholder={placeholderText}
                    onChange={onInputChange}
                    onFocus={handleOpen}
                    onClick={handleOpen}
                    onBlur={handleBlurCommit}
                    role="combobox"
                    aria-controls={listboxId}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    className={inputClasses}
                />

                <div className="absolute inset-y-0 end-0 me-3 flex items-center gap-2">
                    {variant === "single" && !disabled && (
                        <button
                            onClick={() => (isOpen ? close() : open())}
                            type="button"
                            aria-label={isOpen ? "Close" : "Open"}
                            className="rounded-r-md focus:outline-hidden"
                        >
                            <svg
                                className={clsx("h-5 w-5 text-gray-400 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3z"
                                    clipRule="evenodd"
                                />
                                <path
                                    fillRule="evenodd"
                                    d="M6.24 12.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    )}

                    {variant === "single" && !disabled && selectedSingle && (
                        <button onClick={clearSingle} type="button" className="rounded-r-md focus:outline-hidden" aria-label="Clear">
                            <ArchiveBoxXMarkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </button>
                    )}

                    {inProgress && (
                        <span
                            className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500"
                            aria-hidden="true"
                        />
                    )}

                    {variant === "multiple" && !disabled && selectedMulti.length > 0 && (
                        <button onClick={clearMulti} type="button" className="rounded-r-md focus:outline-hidden" aria-label="Clear">
                            <ArchiveBoxXMarkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </button>
                    )}
                </div>

                <OptionList
                    isOpen={isOpen}
                    strategy={dropdownStrategy ?? "inline"}
                    listRef={listRef}
                    fixedStyle={fixedStyle}
                    className={className}
                    onScroll={onScroll}
                    options={options}
                    inProgress={inProgress}
                    emptyLabel={t("noOptions") as string}
                    selectedIds={selectedIds}
                    variant={variant}
                    getLabel={(o: SelectOptionModel): string => getOptionLabel(o)}
                    onPick={variant === "multiple" ? onPickMulti : onPickSingle}
                    imageForSelectedOnly={imageForSelectedOnly}
                    LoaderSlot={LoaderSlot}
                    listboxId={listboxId}
                    onMouseDownInside={() => {
                        interactingWithListRef.current = true;
                    }}
                />
            </div>

            {description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>}

            {variant === "multiple" && selectedMulti.length > 0 && (
                <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-auto rounded-md bg-blue-50 p-2 dark:bg-gray-800">
                    {selectedMulti.map((opt) => (
                        <div
                            key={opt.id}
                            className="flex items-center gap-2 rounded-sm bg-blue-100 px-2 py-1 text-sm font-medium text-blue-800 dark:bg-gray-800 dark:text-amber-500"
                        >
                            {opt.image && (
                                <div className="pointer-events-none inset-y-0 start-0 flex items-center">
                                    <Image width={20} height={20} src={opt.image} alt="" className="h-5 w-5" />
                                </div>
                            )}
                            {getPrimaryLabel(opt)}
                            <button
                                type="button"
                                onClick={() => {
                                    userPickedRef.current = true;
                                    const next = selectedMulti.filter((o) => o.id !== opt.id);
                                    setSelectedMulti(next);
                                    emitMultiIdsChange(next.map((o) => o.id));
                                }}
                                className="ml-2 text-blue-500 focus:outline-hidden dark:text-amber-700"
                                aria-label="Remove"
                            >
                                <ArchiveBoxXMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <FormError error={error} />
        </div>
    );
}

export const BaseComboBoxCore = forwardRef(BaseComboBoxCoreInner) as <
    TFormValues extends FieldValues = FieldValues
>(
    props: BaseComboBoxProps<TFormValues> &
        BaseComboBoxInjected & {
        ref?: React.ForwardedRef<HTMLInputElement>;
    },
) => JSX.Element;

export default BaseComboBoxCore;