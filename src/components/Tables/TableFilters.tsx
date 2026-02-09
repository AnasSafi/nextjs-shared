"use client";

import React, {ChangeEvent, ReactElement, useEffect, useMemo, useState} from "react";
import type {PaginationRequestModel} from "../../models/core/dbModels";
import type {FilterModel} from "../../models/core/dbModels";
import {FunnelIcon, XCircleIcon} from "@heroicons/react/24/outline";

export type OpenFilterModalFn = (args: { filters: FilterModel[] }) =>
    Promise<FilterModel[] | null | undefined>;

export type SubmitFiltersFn = (filters: FilterModel[]) => void;

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

export type TableFiltersTranslations = {
    generalSearch: string;
    advancedFilter: string;
    resetFilters: string;
};

export type TableFiltersSearchInputProps = {
    initValue: string;
    type: string;
    name: string;
    id: string;
    placeholder?: string;
    formLocale: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export type TableFiltersProps = {
    openFilterModalAction?: OpenFilterModalFn;
    submitFiltersAction: SubmitFiltersFn;
    pagination: PaginationRequestModel;
    generalSearchEnabled?: boolean;

    translations: TableFiltersTranslations;
    currentLng: string;

    SearchInput: (props: TableFiltersSearchInputProps) => ReactElement;
    debounceMs?: number;
};

export default function TableFilters(
    {
        openFilterModalAction,
        submitFiltersAction,
        pagination,
        generalSearchEnabled = true,
        translations,
        currentLng,
        SearchInput,
        debounceMs = 400,
    }: TableFiltersProps
): ReactElement {
    const [generalSearch, setGeneralSearch] = useState<string>("");

    async function handleFilter(): Promise<void> {
        if (openFilterModalAction) {
            const data = await openFilterModalAction({filters: pagination.filters ?? []});
            if (data) submitFiltersAction(data);
        }
    }

    const withoutGeneralSearch = (list?: FilterModel[]): FilterModel[] =>
        (list ?? []).filter((f) => f.field !== "generalSearch");

    const debouncedSubmitFilters = useMemo(() => {
        return createDebounced((valRaw: string): void => {
            const val = valRaw.trim();
            const base: FilterModel[] = withoutGeneralSearch(pagination.filters);

            if (val === "") {
                submitFiltersAction(base);
            } else {
                submitFiltersAction([
                    ...base,
                    {field: "generalSearch", value: val, operation: "="},
                ]);
            }
        }, debounceMs);
    }, [submitFiltersAction, pagination.filters, debounceMs]);

    useEffect(() => {
        return () => debouncedSubmitFilters.cancel();
    }, [debouncedSubmitFilters]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const val = e.target.value;
        setGeneralSearch(val);
        debouncedSubmitFilters(val);
    };

    const handleResetFilters = (): void => {
        setGeneralSearch("");
        debouncedSubmitFilters.cancel();
        submitFiltersAction([]);
    };

    return (
        <div className="flex flex-wrap items-center gap-2 w-full">
            {generalSearchEnabled && (
                <div className="w-full sm:w-auto">
                    <SearchInput
                        initValue={generalSearch}
                        type="generalSearch"
                        name="generalSearch"
                        id="generalSearch"
                        placeholder={`${translations.generalSearch}...`}
                        formLocale={currentLng}
                        onChange={handleInputChange}
                    />
                </div>
            )}

            {openFilterModalAction && (
                <div className="w-full sm:w-auto">
                    <button
                        onClick={handleFilter}
                        type="button"
                        className={`inline-flex w-full sm:w-auto justify-center gap-x-1.5 rounded-md ${
                            (pagination.filters?.length ?? 0) > 0
                                ? "bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-700"
                                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        } px-3 py-2 text-sm font-semibold shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-50`}
                    >
                        {translations.advancedFilter}
                        <FunnelIcon
                            className={`-mr-1 h-5 w-5 ${
                                (pagination.filters?.length ?? 0) > 0
                                    ? "text-white"
                                    : "text-gray-400 dark:text-gray-100"
                            }`}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            )}

            {(pagination.filters?.length ?? 0) > 0 && (
                <div className="w-full sm:w-auto">
                    <button
                        onClick={handleResetFilters}
                        type="button"
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-x-1.5 rounded-md bg-red-500 dark:bg-red-600 text-white hover:bg-red-700 px-3 py-2 text-sm font-semibold shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-gray-50"
                    >
                        {translations.resetFilters}
                        <XCircleIcon className="h-5 w-5" aria-hidden="true"/>
                    </button>
                </div>
            )}
        </div>
    );
}
