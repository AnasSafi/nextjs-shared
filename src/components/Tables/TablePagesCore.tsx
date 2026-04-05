"use client";

import React, {
    forwardRef,
    type JSX,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import isEqual from "fast-deep-equal";
import {isNumber} from "lodash";

import {
    CardView,
    type CardViewHandle,
} from "./CardView";
import {PaginationControls} from "./PaginationControls";
import TableSort from "./TableSort";
import {
    TableView,
    type TableViewHandle,
} from "./TableView";
import {useFlashById} from "../../hooks/tableHooks/useFlashById";
import {useDoAction} from "../../hooks/tableHooks/useDoAction";
import {formatNumberWithCommas} from "../../utils/numberUtils";
import {ErrorAlert} from "../Alert/ErrorAlert";
import TableDataStatus from "./TableDataStatus";
import type {TableApiResponse} from "../../models/ui/tableModels";
import type {RowMeta} from "../../models/ui/tableModels";
import type {TableProps} from "../../models/ui/tableModels";
import type {TableDescriptionModel} from "../../models/ui/tableModels";
import type {TablePagesHandle} from "../../models/ui/tableModels";
import {SharedFetchUtil} from "../../utils/fetch/types";
import {TranslateFn} from "../../models/core/localeModels";
import {FilterModel, PaginationRequestModel, SortModel} from "../../models/core/dbModels";
import {ServerSuccessModel} from "../../models/core/formModels";

type ButtonClassNames = Record<string, string>;

const normalizeInitialSorts = (sorts?: SortModel[]): SortModel[] => {
    if (!Array.isArray(sorts)) return [];

    return sorts.reduce<SortModel[]>((acc, sort) => {
        const field = typeof sort?.field === "string" ? sort.field.trim() : "";
        if (!field) return acc;

        const operation = sort?.operation === "asc" || sort?.operation === "desc"
            ? sort.operation
            : "desc";

        acc.push({field, operation});
        return acc;
    }, []);
};

export type TablePagesCoreInjected<R extends RowMeta<string | number, R>> = {
    t: TranslateFn;
    currentLng: string;

    fetchUtil: SharedFetchUtil;

    themeColor: string;
    buttonClassNames: ButtonClassNames;

    tableApiMethod: string;

    TableFiltersComponent: React.ComponentType<{
        openFilterModalAction?: (args: {filters: FilterModel[]}) => Promise<FilterModel[] | null | undefined>;
        submitFiltersAction: (filters: FilterModel[]) => void;
        pagination: PaginationRequestModel;
        generalSearchEnabled?: boolean;
    }>;
};

export type TablePagesCoreProps<R extends RowMeta<string | number, R>> =
    TableProps<R> & TablePagesCoreInjected<R>;

function TablePagesCoreInnerRef<R extends RowMeta<string | number, R>>(
    props: TablePagesCoreProps<R>,
    ref: React.Ref<TablePagesHandle>,
): JSX.Element {
    const {
        data,
        setData,
        apiPath,
        columns,
        titleKey,
        title,
        descriptionKey,
        description,
        nameOfSumKey,
        tableActions,
        clientRowActions = [],
        requestBodyData = {},
        initialSorts,
        openFilterModal,
        generalSearchEnabled,
        scrollWithWindow,
        timeZone,
        autoScrollToTableOnPageChange = true,
        autoScrollToTableOnFirstMount = false,

        t,
        currentLng,
        fetchUtil,
        themeColor,
        buttonClassNames,
        tableApiMethod,
        TableFiltersComponent,
    } = props;

    const [isLoading, setLoading] = useState(true);
    const [inProgress, setInProgress] = useState(false);
    const [showRowsActions, setShowRowsActions] = useState(false);
    const [sortChanged, setSortChanged] = useState(false);
    const [hasError, setHasError] = useState("");
    const [tableDescription, setTableDescription] = useState<
        TableDescriptionModel[]
    >([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [filtersVersion, setFiltersVersion] = useState(0);
    const initialSortsDep: string = JSON.stringify(initialSorts ?? []);
    const normalizedInitialSorts = useMemo<SortModel[]>(
        () => normalizeInitialSorts(initialSorts),
        [initialSortsDep],
    );

    // NEW: detect unknown totalCount -> switch pagination UI
    const [isTotalCountKnown, setIsTotalCountKnown] = useState<boolean>(true);

    // NEW: unknown-total pagination tracking
    const [hasMoreUnknownTotal, setHasMoreUnknownTotal] = useState<boolean>(false);
    const [unknownTotalLastPage, setUnknownTotalLastPage] = useState<number | null>(
        null,
    );

    const tableRef: React.RefObject<HTMLDivElement | null> =
        useRef<HTMLDivElement>(null);
    const hasHandledInitialScrollRef = useRef<boolean>(false);
    const previousPageRef = useRef<number>(1);
    const tableViewRef: React.RefObject<TableViewHandle | null> =
        useRef<TableViewHandle>(null);
    const cardViewRef: React.RefObject<CardViewHandle | null> =
        useRef<CardViewHandle>(null);
    const fetchCtrlRef: React.RefObject<AbortController | null> =
        useRef<AbortController | null>(null);
    const currentSortsRef = useRef<SortModel[]>(normalizedInitialSorts);

    const [pagination, setPagination] = useState<PaginationRequestModel>(() => ({
        getMorePath: apiPath,
        page: 1,
        pageSize: 20,
        totalCount: 0,
        sorts: normalizedInitialSorts,
        sortableFields: [],
        filters: [],
    }));

    /* ------------ helpers ------------ */
    const flashRowById: (
        id: string | number,
        flashes?: number,
        interval?: number,
    ) => void = useFlashById(data, tableViewRef, cardViewRef);

    const doActionBase: (actionKey: "refresh") => void = useDoAction(
        setPagination,
        setRefreshKey,
        pagination,
    );

    // Wrap refresh to reset unknown-total tracking
    const doAction: (actionKey: "refresh") => void = useCallback(
        (actionKey: "refresh"): void => {
            if (actionKey === "refresh") {
                setUnknownTotalLastPage(null);
                setHasMoreUnknownTotal(false);
                setIsTotalCountKnown(true);
            }
            doActionBase(actionKey);
        },
        [doActionBase],
    );

    useImperativeHandle(ref, () => ({flashRowById, doAction}), [
        flashRowById,
        doAction,
    ]);

    /* ------------ sort handling ------------ */
    const updateSorts = (newSort: SortModel): void => {
        setSortChanged(true);
        setPagination((prev: PaginationRequestModel) => {
            const updated: SortModel[] = [...(prev.sorts ?? [])];
            const idx: number = updated.findIndex(
                (s: SortModel): boolean => s.field === newSort.field,
            );

            if (newSort.doClear) {
                if (idx > -1) updated.splice(idx, 1);
            } else if (idx > -1) {
                updated[idx].operation = newSort.operation;
            } else {
                updated.push(newSort);
            }
            return {...prev, sorts: updated};
        });
    };

    useEffect((): void => {
        currentSortsRef.current = pagination.sorts ?? [];
    }, [pagination.sorts]);

    useEffect((): void => {
        if (normalizedInitialSorts.length === 0) return;
        if ((currentSortsRef.current?.length ?? 0) > 0) return;
        if (isEqual(currentSortsRef.current ?? [], normalizedInitialSorts)) return;

        setSortChanged(true);
        setPagination((prev: PaginationRequestModel) => ({
            ...prev,
            sorts: normalizedInitialSorts,
        }));
    }, [initialSortsDep, normalizedInitialSorts]);

    useEffect((): void => {
        if (sortChanged) {
            setSortChanged(false);

            // Reset unknown-total tracking on query change
            setUnknownTotalLastPage(null);
            setHasMoreUnknownTotal(false);
            setIsTotalCountKnown(true);

            setData([]);
            setPagination((p: PaginationRequestModel) => ({
                ...p,
                page: 1,
                totalCount: 0,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.sorts]);

    /* ------------ filter handling ------------ */
    const submitFilters: (filters: FilterModel[]) => void = (
        filters: FilterModel[],
    ): void => {
        // Reset unknown-total tracking on query change
        setUnknownTotalLastPage(null);
        setHasMoreUnknownTotal(false);
        setIsTotalCountKnown(true);

        setFiltersVersion((v: number): number => v + 1);
        setPagination((p: PaginationRequestModel) => ({...p, filters, page: 1}));
    };

    const resetFilters: () => void = (): void => {
        // Reset unknown-total tracking on query change
        setUnknownTotalLastPage(null);
        setHasMoreUnknownTotal(false);
        setIsTotalCountKnown(true);

        setFiltersVersion((v: number): number => v + 1);
        setPagination((p: PaginationRequestModel) => ({
            ...p,
            filters: [],
            page: 1,
        }));
    };

    /* ============ data fetch ============ */
    const sortsDep: string = JSON.stringify(pagination.sorts);
    const requestBodyDep: string = JSON.stringify(requestBodyData);
    const currentPage: number = pagination.page ?? 1;

    // If apiPath/body changes, reset unknown tracking
    useEffect((): void => {
        setUnknownTotalLastPage(null);
        setHasMoreUnknownTotal(false);
        setIsTotalCountKnown(true);
    }, [apiPath, requestBodyDep]);

    useEffect((): () => void => {
        /* cancel previous request */
        fetchCtrlRef.current?.abort();
        const ctrl = new AbortController();
        fetchCtrlRef.current = ctrl;

        /* optimistic UI: clear rows to show skeleton/empty state */
        setData([]);
        setInProgress(true);
        if (currentPage === 1) setLoading(true);

        const load = async (): Promise<void> => {
            try {
                const res: ServerSuccessModel<TableApiResponse<R>> =
                    await fetchUtil<ServerSuccessModel<TableApiResponse<R>>>({
                        path: apiPath,
                        method: tableApiMethod,
                        body: {pagination, data: requestBodyData},
                        signal: ctrl.signal,
                    });

                if (ctrl.signal.aborted) return;

                const payload = res.success.data;
                if (!payload) return;

                const rows = payload.tableRows ?? [];
                const pageSize = pagination.pageSize ?? 20;

                const apiTotalCount = payload.pagination.totalCount;

                // Detect unknown totalCount:
                // - not finite / undefined / null / NaN
                // - < 0
                // - OR totalCount === 0 while rows exist (common "unknown total" pattern)
                const unknownTotalCount: boolean =
                    !Number.isFinite(apiTotalCount as number) ||
                    (typeof apiTotalCount === "number" && apiTotalCount < 0) ||
                    (apiTotalCount === 0 && rows.length > 0);

                setIsTotalCountKnown(!unknownTotalCount);

                if (unknownTotalCount) {
                    // If we got an empty page (after clicking next), we reached the end:
                    // lock lastPage and jump back to the last page that had data.
                    if (rows.length === 0 && currentPage > 1) {
                        const lastPage = Math.max(1, currentPage - 1);
                        setUnknownTotalLastPage(lastPage);
                        setHasMoreUnknownTotal(false);

                        setPagination((p: PaginationRequestModel) => ({
                            ...p,
                            page: lastPage,
                        }));
                        return;
                    }

                    // If less than pageSize => last page
                    if (rows.length < pageSize) {
                        setUnknownTotalLastPage(currentPage);
                        setHasMoreUnknownTotal(false);
                    } else {
                        // full page => assume there may be more
                        setHasMoreUnknownTotal(true);
                    }
                } else {
                    // Known total => use numeric pagination
                    setUnknownTotalLastPage(null);
                    setHasMoreUnknownTotal(false);
                }

                setData(rows);

                if (payload.description) {
                    setTableDescription(payload.description);
                }

                // notify parent meta (optional)
                props.onMetaChange?.({
                    description: payload.description,
                    totalCount:
                        !unknownTotalCount && typeof apiTotalCount === "number"
                            ? apiTotalCount
                            : undefined,
                });

                setPagination((prev: PaginationRequestModel) => {
                    const next = {
                        ...prev,
                        totalCount: payload.pagination.totalCount,
                        sortableFields: payload.pagination.sortableFields,
                        filters: payload.pagination.filters,
                    };
                    return isEqual(prev, next) ? prev : next;
                });
            } catch (e: unknown) {
                if (!ctrl.signal.aborted) {
                    const error = e as {
                        serverError?: { error?: { message?: string | string[] } };
                        message?: string;
                    };
                    const raw = error?.serverError?.error?.message;
                    const msg =
                        (Array.isArray(raw) ? raw[0] : raw) ??
                        error?.message ??
                        "Unexpected error";
                    setHasError(msg);
                }
            } finally {
                if (!ctrl.signal.aborted) {
                    setLoading(false);
                    setInProgress(false);
                }
            }
        };

        load().then((): void => {
        });

        /* cleanup */
        return (): void => ctrl.abort();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        pagination.page,
        sortsDep,
        filtersVersion,
        apiPath,
        requestBodyDep,
        refreshKey,
    ]);

    /* scroll to table on initial mount/page change (configurable) */
    useEffect((): void => {
        const isFirstMount: boolean = !hasHandledInitialScrollRef.current;
        const hasPageChanged: boolean = previousPageRef.current !== currentPage;

        hasHandledInitialScrollRef.current = true;
        previousPageRef.current = currentPage;

        if (isFirstMount) {
            if (autoScrollToTableOnFirstMount) {
                tableRef.current?.scrollIntoView({behavior: "smooth"});
            }
            return;
        }

        if (hasPageChanged && autoScrollToTableOnPageChange) {
            tableRef.current?.scrollIntoView({behavior: "smooth"});
        }
    }, [
        currentPage,
        autoScrollToTableOnFirstMount,
        autoScrollToTableOnPageChange,
    ]);

    /* detect if rows have action column */
    useEffect((): void => {
        setShowRowsActions(
            data.some((row) => Array.isArray(row.actions) && row.actions.length > 0),
        );
    }, [data, clientRowActions]);

    const totalPages: number = isTotalCountKnown
        ? Math.ceil((pagination.totalCount ?? 0) / (pagination.pageSize ?? 20))
        : 0;

    const hasMoreData: boolean = isTotalCountKnown
        ? currentPage < totalPages
        : unknownTotalLastPage !== null
            ? currentPage < unknownTotalLastPage
            : hasMoreUnknownTotal;

    /* error boundary */
    if (hasError) {
        return (
            <ErrorAlert
                t={t}
                titleKey={t("error")}
                messageKey={hasError || t("unexpectedErrorMessage")}
            />
        );
    }

    /* ------------ JSX ------------ */
    const containerCls: string =
        "px-4 sm:px-6 lg:px-8" + (scrollWithWindow ? " overflow-x-auto" : "");

    return (
        <div ref={tableRef} className={containerCls}>
            {/* HEADER */}
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    {(titleKey || title) && (
                        <h1 className="text-base font-semibold leading-6 dark:text-white">
                            {title ?? t(titleKey!)}
                        </h1>
                    )}

                    {(descriptionKey || description) && (
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-50">
                            {description ?? t(descriptionKey!)}
                        </p>
                    )}

                    {!isLoading && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-200">
                            {t("totalOfDescription", {
                                countNumber:
                                    isTotalCountKnown && isNumber(pagination.totalCount)
                                        ? formatNumberWithCommas(pagination.totalCount)
                                        : "—",
                                nameOfSum: nameOfSumKey ? t(nameOfSumKey) : t("theResults"),
                            })}
                        </div>
                    )}

                    {/* active filters */}
                    {(pagination.filters?.length ?? 0) > 0 && !isLoading && (
                        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-base font-semibold dark:text-white shrink-0">
                {t("filtersApplied")}:
              </span>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-200">
                                {pagination.filters?.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 dark:bg-gray-800 max-w-full"
                                    >
                    <span className="me-1 text-xs font-medium text-gray-500 dark:text-gray-300">
                      {t(item.field)}:
                    </span>
                    <span className="font-semibold text-green-900 dark:text-green-200 break-all">
                      {item.readableValue ?? item.value.toString()}
                    </span>
                  </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* extra description */}
                    {tableDescription.length > 0 && (
                        <div className="mt-2 flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-200">
                            {tableDescription.map(
                                (item, idx) =>
                                    !item.isHiddenData && (
                                        <div key={idx}>
                                            {item.label}:{" "}
                                            <span className="bg-gray-200 dark:bg-gray-800 py-1 px-2.5 rounded-md">
                        {item.value}
                      </span>
                                        </div>
                                    ),
                            )}
                        </div>
                    )}
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex flex-col gap-2 sm:ms-16 sm:mt-0 sm:flex-none">
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {(openFilterModal || generalSearchEnabled) && (
                            <TableFiltersComponent
                                openFilterModalAction={openFilterModal}
                                submitFiltersAction={submitFilters}
                                pagination={pagination}
                                generalSearchEnabled={generalSearchEnabled}
                            />
                        )}

                        <TableSort pagination={pagination} updateSorts={updateSorts} t={t}/>

                        {tableActions?.map((a) => (
                            <button
                                key={a.key}
                                type="button"
                                onClick={a.onClick}
                                style={a.style}
                                className={`rounded-md px-3 py-2 text-sm font-semibold shadow-xs ${
                                    buttonClassNames[a.variant ?? "primary"]
                                }`}
                            >
                                {a.label}
                            </button>
                        ))}
                    </div>

                    {/* optional quick filters row */}
                    {props.quickFilters && (
                        <div className="flex flex-col flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                            <div className="text-xs text-gray-500 dark:text-gray-200">
                                {t("quickFilters")}:
                            </div>
                            <div>
                                {props.quickFilters({
                                    pagination,
                                    submitFilters,
                                    resetFilters,
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PAGINATION (top) */}
            <PaginationControls
                themeColor={themeColor}
                mode={isTotalCountKnown ? "pages" : "nextPrev"}
                current={currentPage}
                total={isTotalCountKnown ? totalPages : undefined}
                hasNext={!isTotalCountKnown ? hasMoreData : undefined}
                onChange={(p) => setPagination((prev) => ({...prev, page: p}))}
                disabled={inProgress}
            />

            {/* TABLE / CARD VIEW */}
            <div className="relative">
                <CardView
                    ref={cardViewRef}
                    data={data}
                    columns={columns}
                    timeZone={timeZone}
                    clientRowActions={clientRowActions}
                    showRowsActions={showRowsActions}
                    currentLng={currentLng}
                    t={t}
                />
                <TableView
                    ref={tableViewRef}
                    data={data}
                    columns={columns}
                    timeZone={timeZone}
                    clientRowActions={clientRowActions}
                    showRowsActions={showRowsActions}
                    currentLng={currentLng}
                    t={t}
                />

                <div className="m-6">
                    <TableDataStatus
                        hasMoreData={hasMoreData}
                        inProgress={inProgress}
                        dataLength={data.length}
                        noDataText={t("noDataToShow")}
                    />
                </div>
            </div>

            {/* PAGINATION (bottom) */}
            <PaginationControls
                themeColor={themeColor}
                mode={isTotalCountKnown ? "pages" : "nextPrev"}
                current={currentPage}
                total={isTotalCountKnown ? totalPages : undefined}
                hasNext={!isTotalCountKnown ? hasMoreData : undefined}
                onChange={(p) => setPagination((prev) => ({...prev, page: p}))}
                disabled={inProgress}
            />
        </div>
    );
}

export const TablePagesCore = forwardRef(TablePagesCoreInnerRef) as <
    R extends RowMeta<string | number, R>,
>(
    p: TablePagesCoreProps<R> & { ref?: React.Ref<TablePagesHandle> },
) => JSX.Element;
