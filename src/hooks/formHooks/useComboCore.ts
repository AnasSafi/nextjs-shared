"use client";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useId,
    type RefObject,
    type CSSProperties,
    type UIEvent,
    type ChangeEvent,
} from "react";
import debounce from "lodash.debounce";
import type {PaginationModel, SelectOptionModel} from "../../models/core/dbModels";
import {
    type DropdownStrategy,
    localFilterRank,
    mergeUniqueById,
    useClickOutside,
    useFixedDropdownPosition,
} from "../../components/Form/Helpers/ComboboxShared";

/* Smart search thresholds */
const MIN_CHARS_REMOTE = 2;

/* Types */
export type FetchComboPageFn = (
    pagination: PaginationModel,
    page: number,
    search: string,
) => Promise<SelectOptionModel[]>;

export interface UseComboCoreConfig {
    pagination?: PaginationModel | null;
    initialData?: SelectOptionModel[];
    getLabel: (opt: SelectOptionModel) => string;
    setParentInProgress?: React.Dispatch<React.SetStateAction<boolean>>;
    dropdownStrategy?: DropdownStrategy;
    disabled?: boolean;
    autoOpenOnType?: boolean;

    fetchPage?: FetchComboPageFn;
}

export interface UseComboCoreReturn {
    inputRef: RefObject<HTMLInputElement | null>;
    listRef: RefObject<HTMLUListElement | null>;
    anchorRef: RefObject<HTMLDivElement | null>;

    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;

    inProgress: boolean;
    options: SelectOptionModel[];
    setOptions: React.Dispatch<React.SetStateAction<SelectOptionModel[]>>;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;

    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onScroll: (e: UIEvent<HTMLUListElement>) => void;

    fixedStyle?: CSSProperties;

    isRemote: boolean;

    resetDatasource: (
        search?: string,
        opts?: {
            preserveScroll?: boolean;
            keepInputValue?: boolean;
            openAfterFetch?: boolean;
        }
    ) => void;

    insertOption: (opt: SelectOptionModel) => void;

    replaceOption: (opt: SelectOptionModel) => void;
    removeOptionById: (id: string) => void;

    listboxId: string;
}

/* Hook */
export function useComboCore(
    {
        pagination = null,
        initialData = [],
        getLabel,
        setParentInProgress,
        dropdownStrategy = "fixed",
        disabled = false,
        autoOpenOnType = true,
        fetchPage,
    }: UseComboCoreConfig,
): UseComboCoreReturn {
    const searchRef = useRef<string>("");
    const lastQueryRef = useRef<string>("");

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);

    const defaultLoadedRef = useRef<SelectOptionModel[]>(initialData);
    const allLoadedRef = useRef<SelectOptionModel[]>(initialData);

    const [options, setOptions] = useState<SelectOptionModel[]>(allLoadedRef.current);

    const [isOpen, setOpen] = useState<boolean>(false);
    const [inProgress, setInProgress] = useState<boolean>(false);
    const [inputValue, setInputValue] = useState<string>("");

    const [page, setPage] = useState<number>(1);
    const [hasMore, setHasMore] = useState<boolean>(true);

    const reactId: string = useId();
    const listboxId: string = `combobox-options-${reactId}`;

    const fetchSeqRef = useRef<number>(0);

    const prevInputValueRef = useRef<string>("");
    const lastEmptyResetForQueryRef = useRef<string>("");
    const skipNextEmptyTransitionRef = useRef<boolean>(false);

    const isRemote: boolean = Boolean(pagination?.pagination?.getMorePath) && typeof fetchPage === "function";

    const paginationSig = useMemo((): string => {
        const arr = Array.isArray(pagination?.data) ? (pagination!.data as SelectOptionModel[]) : [];
        const ids = arr.map((o) => o.id).join("|");
        const path = pagination?.pagination?.getMorePath ?? "";
        const total = (pagination?.pagination?.totalCount as number | undefined) ?? "x";
        return `${path}::${total}::${ids}`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination?.data, pagination?.pagination?.getMorePath, pagination?.pagination?.totalCount]);

    useEffect(() => {
        const next: SelectOptionModel[] = Array.isArray(pagination?.data)
            ? (pagination!.data as SelectOptionModel[])
            : [];

        defaultLoadedRef.current = next;
        allLoadedRef.current = next;

        setOptions(next);
        setHasMore(true);
        setPage(1);

        lastQueryRef.current = "";
        searchRef.current = "";

        prevInputValueRef.current = "";
        lastEmptyResetForQueryRef.current = "";
        skipNextEmptyTransitionRef.current = false;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationSig]);

    const recalcLocal = useCallback(
        (value: string, forceRemoteFullSet: boolean = false): SelectOptionModel[] => {
            const trimmed = value.trim();

            const useRemoteSet =
                isRemote &&
                (forceRemoteFullSet ||
                    (trimmed.length > 0 &&
                        (trimmed.length >= MIN_CHARS_REMOTE || lastQueryRef.current === trimmed)));

            const base: SelectOptionModel[] = useRemoteSet
                ? (allLoadedRef.current ?? [])
                : (defaultLoadedRef.current ?? []);

            if (trimmed.length === 0) return [...base];

            return localFilterRank(base, value, (o) => getLabel(o), {
                softFilter: useRemoteSet && lastQueryRef.current === trimmed,
            });
        },
        [getLabel, isRemote],
    );

    const open = useCallback((): void => {
        if (disabled) return;
        setOpen(true);
    }, [disabled]);

    const close = useCallback((): void => {
        setOpen(false);
    }, []);

    const toggle = useCallback((): void => (isOpen ? close() : open()), [isOpen, close, open]);

    const listRefHTMLElement = listRef as unknown as RefObject<HTMLElement>;
    const inputRefHTMLElement = inputRef as unknown as RefObject<HTMLElement>;

    const outsideRefs = useMemo(
        () => [listRefHTMLElement, inputRefHTMLElement] as const,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    useClickOutside(isOpen, outsideRefs, close);

    useEffect(() => {
        if (isOpen && dropdownStrategy === "inline") {
            anchorRef.current?.scrollIntoView({block: "nearest"});
        }
    }, [isOpen, dropdownStrategy]);

    const fixedStyle: CSSProperties | undefined = useFixedDropdownPosition(
        isOpen,
        dropdownStrategy,
        anchorRef,
        inputRef,
        listboxId,
    );

    useEffect(() => {
        if (isOpen && listRef.current) listRef.current.scrollTop = 0;
    }, [isOpen]);

    const fetchRemote = useCallback(
        async (
            pageToLoad: number,
            searchStr: string,
            opts?: { openOnSuccess?: boolean },
        ): Promise<void> => {
            if (!pagination || !pagination.pagination.getMorePath) return;
            if (!fetchPage) return;

            const seq: number = ++fetchSeqRef.current;

            setInProgress(true);
            setParentInProgress?.(true);

            try {
                const isNewQuery: boolean = pageToLoad === 1 && searchStr !== lastQueryRef.current;
                if (isNewQuery) {
                    allLoadedRef.current = [];
                }

                const newData: SelectOptionModel[] = await fetchPage(pagination, pageToLoad, searchStr);

                if (seq !== fetchSeqRef.current) return;

                allLoadedRef.current = mergeUniqueById(allLoadedRef.current, newData);

                if (searchStr.trim().length === 0) {
                    defaultLoadedRef.current = allLoadedRef.current;
                }

                const ps: number = pagination.pagination.pageSize ?? 10;
                const total: number | null | undefined = pagination.pagination.totalCount;
                const more: boolean =
                    typeof total === "number" ? pageToLoad * ps < total : newData.length === ps;

                lastQueryRef.current = searchStr;
                setOptions(recalcLocal(searchStr, true));
                setHasMore(more);
                setPage(pageToLoad);

                const openOnSuccess: boolean = opts?.openOnSuccess ?? true;
                if (openOnSuccess) setOpen(true);
            } catch {
                if (seq !== fetchSeqRef.current) return;
                setHasMore(false);
            } finally {
                if (seq === fetchSeqRef.current) {
                    setInProgress(false);
                    setParentInProgress?.(false);
                }
            }
        },
        [fetchPage, pagination, recalcLocal, setParentInProgress],
    );

    const debouncedFetchRemote = useMemo(() => {
        const run = (value: string): void => {
            setHasMore(true);
            setInProgress(true);
            searchRef.current = value;
            void fetchRemote(1, value, {openOnSuccess: true});
        };
        return debounce(run, 400, {leading: true, trailing: true, maxWait: 1000});
    }, [fetchRemote]);

    useEffect(() => {
        return () => {
            debouncedFetchRemote.cancel();
        };
    }, [debouncedFetchRemote]);

    const insertOption = useCallback(
        (opt: SelectOptionModel): void => {
            allLoadedRef.current = mergeUniqueById(allLoadedRef.current, [opt]);
            defaultLoadedRef.current = mergeUniqueById(defaultLoadedRef.current, [opt]);
            setOptions(recalcLocal(inputValue));
        },
        [inputValue, recalcLocal],
    );

    const replaceOption = useCallback(
        (opt: SelectOptionModel): void => {
            const upsert = (arr: SelectOptionModel[]): SelectOptionModel[] => {
                const byId: Map<string, SelectOptionModel> = new Map(arr.map((o) => [o.id, o]));
                byId.set(opt.id, opt);
                return Array.from(byId.values());
            };

            allLoadedRef.current = upsert(allLoadedRef.current ?? []);
            defaultLoadedRef.current = upsert(defaultLoadedRef.current ?? []);

            setOptions(recalcLocal(inputValue));
        },
        [inputValue, recalcLocal],
    );

    const removeOptionById = useCallback(
        (id: string): void => {
            allLoadedRef.current = (allLoadedRef.current ?? []).filter((o) => o.id !== id);
            defaultLoadedRef.current = (defaultLoadedRef.current ?? []).filter((o) => o.id !== id);
            setOptions(recalcLocal(inputValue));
        },
        [inputValue, recalcLocal],
    );

    const resetDatasource = useCallback(
        (
            search: string = "",
            opts?: { preserveScroll?: boolean; keepInputValue?: boolean; openAfterFetch?: boolean },
        ): void => {
            const prevScroll: number = listRef.current?.scrollTop ?? 0;

            searchRef.current = search;

            if (!opts?.keepInputValue) setInputValue(search);
            setOptions(recalcLocal(search));

            if (isRemote) {
                debouncedFetchRemote.cancel();

                setHasMore(true);
                setPage(1);
                setInProgress(true);

                const openAfterFetch: boolean = opts?.openAfterFetch ?? isOpen;

                void fetchRemote(1, search, {openOnSuccess: openAfterFetch}).then(() => {
                    if (opts?.preserveScroll) {
                        requestAnimationFrame(() => {
                            if (listRef.current) {
                                const max: number = Math.max(
                                    0,
                                    listRef.current.scrollHeight - listRef.current.clientHeight,
                                );
                                listRef.current.scrollTop = Math.min(prevScroll, max);
                            }
                        });
                    } else {
                        requestAnimationFrame(() => {
                            if (listRef.current) listRef.current.scrollTop = 0;
                        });
                    }
                });
            } else {
                if (opts?.preserveScroll) {
                    requestAnimationFrame(() => {
                        if (listRef.current) {
                            const max: number = Math.max(
                                0,
                                listRef.current.scrollHeight - listRef.current.clientHeight,
                            );
                            listRef.current.scrollTop = Math.min(prevScroll, max);
                        }
                    });
                } else {
                    if (listRef.current) listRef.current.scrollTop = 0;
                }
            }
        },
        [debouncedFetchRemote, fetchRemote, isOpen, isRemote, recalcLocal],
    );

    const onInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const v: string = e.currentTarget.value;
        setInputValue(v);
        searchRef.current = v;

        if (autoOpenOnType && !isOpen && !disabled) setOpen(true);

        if (isRemote && v.trim().length === 0) {
            skipNextEmptyTransitionRef.current = true;
            lastEmptyResetForQueryRef.current = lastQueryRef.current.trim();

            resetDatasource("", {keepInputValue: true, openAfterFetch: true});
            return;
        }

        const local = recalcLocal(v);
        setOptions(local);

        const len: number = v.trim().length;

        const willRemote: boolean =
            isRemote && (len >= MIN_CHARS_REMOTE || (len > 0 && local.length === 0));

        if (willRemote) {
            debouncedFetchRemote(v);
        } else {
            debouncedFetchRemote.cancel();
        }
    };

    const onScroll = (e: UIEvent<HTMLUListElement>): void => {
        if (!isRemote || inProgress || !hasMore) return;

        const target: HTMLUListElement = e.currentTarget;
        const thresholdPx = 24;
        const isBottom: boolean =
            target.scrollTop + target.clientHeight >= target.scrollHeight - thresholdPx;

        if (isBottom) {
            const next: number = page + 1;
            void fetchRemote(next, searchRef.current, {openOnSuccess: true});
        }
    };

    useEffect(() => {
        const prev = prevInputValueRef.current;
        prevInputValueRef.current = inputValue;

        const prevTrim = prev.trim();
        const nowTrim = inputValue.trim();

        if (prevTrim.length === 0 || nowTrim.length !== 0) return;

        if (skipNextEmptyTransitionRef.current) {
            skipNextEmptyTransitionRef.current = false;
            return;
        }

        const last = lastQueryRef.current.trim();
        if (isRemote && last.length > 0) {
            if (lastEmptyResetForQueryRef.current === last) return;

            lastEmptyResetForQueryRef.current = last;
            resetDatasource("", {keepInputValue: true, openAfterFetch: isOpen});
            return;
        }

        debouncedFetchRemote.cancel();
        searchRef.current = "";
        setHasMore(true);
        setPage(1);
        setOptions(recalcLocal(""));
    }, [debouncedFetchRemote, inputValue, isOpen, isRemote, recalcLocal, resetDatasource]);

    return {
        inputRef,
        listRef,
        anchorRef,
        isOpen,
        open,
        close,
        toggle,
        inProgress,
        options,
        setOptions,
        inputValue,
        setInputValue,
        onInputChange,
        onScroll,
        fixedStyle,
        isRemote,
        resetDatasource,
        insertOption,
        replaceOption,
        removeOptionById,
        listboxId,
    };
}
