"use client";

import React, {type JSX, useState, useImperativeHandle, forwardRef, useRef} from "react";
import {
    usePermission,
    useUserStore,
    Error401,
    Error403, TranslateFn,
} from "../../index";
import type {
    Column,
    RowAction,
    RowMeta,
    ListPageProps,
    ListPageRef,
    TablePagesHandle,
    TableProps,
} from "../../models/ui/tableModels";

export type ListPageInjectedProps<Row extends RowMeta<string | number, any>> = {
    TablePagesComponent: React.ForwardRefExoticComponent<
        React.PropsWithoutRef<TableProps<Row>> & React.RefAttributes<TablePagesHandle>
    >;
    t: TranslateFn;
};

function InnerListPage<T>(
    props: ListPageProps<T> & ListPageInjectedProps<T & RowMeta<string | number, T>>,
    ref: React.ForwardedRef<ListPageRef<T & RowMeta<string | number, T>>>,
): JSX.Element {
    const {
        apiPath,
        columns,
        clientRowActions = [],
        tableActions = [],
        titleKey,
        title,
        descriptionKey,
        description,
        nameOfSumKey,
        filterModal,
        requiredPerms = [],
        generalSearchEnabled,
        scrollWithWindow,
        autoScrollToTableOnPageChange,
        autoScrollToTableOnFirstMount,
        requestBodyData,
        quickFilters,
        onMetaChange,
        tablePermissions,

        TablePagesComponent,
        t,
    } = props;

    const {allowed, loading} = usePermission(requiredPerms);

    type Row = T & RowMeta<string | number, T>;
    const [data, setData] = useState<Row[]>([]);
    const tablePagesRef: React.RefObject<TablePagesHandle | null> = useRef<TablePagesHandle>(null);
    const {user} = useUserStore();

    useImperativeHandle(ref, () => ({
        setData,
        flashRowById: (...args) => tablePagesRef.current?.flashRowById(...args),
        doAction: (...args) => tablePagesRef.current?.doAction(...args),
    }));

    if (loading) return <></>;

    if (!allowed) return <Error403 t={t} />;
    if (!user) return <Error401 t={t} />;
    if (tablePermissions && !user.hasOneOfPermissions(tablePermissions ?? [])) return <Error403 t={t} />;

    return (
        <TablePagesComponent
            ref={tablePagesRef}
            data={data}
            setData={setData}
            apiPath={apiPath}
            columns={columns as Column<Row>[]}
            clientRowActions={clientRowActions as RowAction<Row>[]}
            tableActions={tableActions}
            titleKey={titleKey}
            title={title}
            descriptionKey={descriptionKey}
            description={description}
            nameOfSumKey={nameOfSumKey}
            openFilterModal={filterModal}
            scrollWithWindow={scrollWithWindow}
            autoScrollToTableOnPageChange={autoScrollToTableOnPageChange}
            autoScrollToTableOnFirstMount={autoScrollToTableOnFirstMount}
            generalSearchEnabled={generalSearchEnabled}
            requestBodyData={requestBodyData}
            quickFilters={quickFilters}
            onMetaChange={onMetaChange}
        />
    );
}

export const ListPage = forwardRef(InnerListPage) as <T>(
    props: ListPageProps<T> &
        ListPageInjectedProps<T & RowMeta<string | number, T>> & {
        ref?: React.ForwardedRef<ListPageRef<T & RowMeta<string | number, T>>>;
    },
) => JSX.Element;
