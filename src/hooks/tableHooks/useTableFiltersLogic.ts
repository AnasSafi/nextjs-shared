"use client";

import {useEffect, useMemo, useState} from "react";
import type {FilterModel} from "../../models/core/dbModels";

export type SubmitFiltersFn = (filters: FilterModel[]) => void;

export type UseTableFiltersLogicParams = {
    initialFilters?: FilterModel[];
    submitFilters: SubmitFiltersFn;
    debounceMs?: number;
    generalSearchFieldName?: string;
};

export type UseTableFiltersLogicResult = {
    generalSearch: string;
    setGeneralSearch: (value: string) => void;
    onGeneralSearchChange: (value: string) => void;
    resetFilters: () => void;
    getFiltersWithoutGeneralSearch: () => FilterModel[];
};

type DebouncedFn<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
    cancel: () => void;
};

function createDebounced<TArgs extends unknown[]>(
    fn: (...args: TArgs) => void,
    waitMs: number
): DebouncedFn<TArgs> {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const debounced = ((...args: TArgs) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, waitMs);
    }) as DebouncedFn<TArgs>;

    debounced.cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    return debounced;
}

export function useTableFiltersLogic(params: UseTableFiltersLogicParams): UseTableFiltersLogicResult {
    const {
        initialFilters,
        submitFilters,
        debounceMs = 400,
        generalSearchFieldName = "generalSearch",
    } = params;

    const [generalSearch, setGeneralSearchState] = useState<string>("");

    const getFiltersWithoutGeneralSearch = (): FilterModel[] =>
        (initialFilters ?? []).filter((f) => f.field !== generalSearchFieldName);

    const debouncedSubmit = useMemo(() => {
        return createDebounced((raw: string) => {
            const val = raw.trim();
            const base: FilterModel[] = getFiltersWithoutGeneralSearch();

            if (val === "") {
                submitFilters(base);
            } else {
                submitFilters([
                    ...base,
                    {field: generalSearchFieldName, value: val, operation: "="},
                ]);
            }
        }, debounceMs);
        // initialFilters can change; we want the latest list applied
    }, [submitFilters, debounceMs, generalSearchFieldName, initialFilters]);

    useEffect(() => {
        return () => debouncedSubmit.cancel();
    }, [debouncedSubmit]);

    const setGeneralSearch = (value: string): void => {
        setGeneralSearchState(value);
        debouncedSubmit(value);
    };

    const onGeneralSearchChange = (value: string): void => {
        setGeneralSearch(value);
    };

    const resetFilters = (): void => {
        setGeneralSearchState("");
        debouncedSubmit.cancel();
        submitFilters([]);
    };

    return {
        generalSearch,
        setGeneralSearch,
        onGeneralSearchChange,
        resetFilters,
        getFiltersWithoutGeneralSearch,
    };
}
