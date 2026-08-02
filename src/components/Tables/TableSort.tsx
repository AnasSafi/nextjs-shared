"use client";

import React, {useState} from "react";
import clsx from "clsx";
import {ChevronDownIcon, BarsArrowUpIcon, BarsArrowDownIcon} from "@heroicons/react/20/solid";
import type {PaginationRequestModel, SortModel} from "../../models/core/dbModels";
import {TranslateFn} from "../../models/core/localeModels";
import {
    FloatingFocusManager,
    FloatingPortal,
    useTableFloatingMenu,
} from "./TableFloatingMenu";

export type TableSortProps = {
    pagination: PaginationRequestModel;
    updateSorts: (newSort: SortModel) => void;
    t: TranslateFn;
};

export default function TableSort({pagination, updateSorts, t}: TableSortProps) {
    const [open, setOpen] = useState(false);

    const {
        refs,
        context,
        floatingStyles,
        getReferenceProps,
        getFloatingProps,
        isPositioned,
        triggerId,
        menuId,
        direction,
    } = useTableFloatingMenu({
        open,
        onOpenChange: setOpen,
    });

    if (!pagination?.sortableFields?.length) return null;

    const radioLabel: string =
        "inline-flex items-center justify-between w-full p-1 text-gray-500 bg-white " +
        "border border-gray-200 rounded-lg cursor-pointer hover:text-gray-600 hover:bg-gray-100 " +
        "peer-checked:border-amber-600 peer-checked:text-amber-600 " +
        "dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 " +
        "dark:border-gray-700 dark:peer-checked:text-amber-500";

    return (
        <div className="relative inline-block text-left">
            <button
                ref={refs.setReference}
                type="button"
                id={triggerId}
                aria-controls={open ? menuId : undefined}
                {...getReferenceProps({
                    "aria-haspopup": "menu",
                    "aria-expanded": open,
                })}
                className="inline-flex w-full items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold
                   text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50
                   dark:bg-gray-800 dark:text-white dark:ring-gray-50 dark:hover:bg-gray-700"
            >
                {t("sortBy")}
                <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-100"/>
            </button>

            {open && (
                <FloatingPortal id="dropdown-root">
                    <FloatingFocusManager
                        context={context}
                        modal={false}
                        initialFocus={-1}
                        returnFocus={true}
                    >
                    <div
                        ref={refs.setFloating}
                        id={menuId}
                        {...getFloatingProps({
                            role: "menu",
                            "aria-labelledby": triggerId,
                        })}
                        className={clsx(
                            "z-30 min-w-[11rem] w-[min(92vw,20rem)] max-w-[calc(100vw-1rem)]",
                        )}
                        style={{
                            ...floatingStyles,
                            visibility: isPositioned ? "visible" : "hidden",
                        }}
                        dir={direction}
                        data-positioned={isPositioned ? "true" : "false"}
                    >
                        <div
                            style={{maxWidth: "inherit", maxHeight: "inherit"}}
                            className={clsx(
                                "overflow-auto overscroll-contain divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black/5",
                                "dark:bg-gray-950 dark:ring-white/10",
                            )}
                        >
                            {pagination.sortableFields.map((sort) => {
                                const current = pagination.sorts?.find((s) => s.field === sort.fieldKey);
                                return (
                                    <div
                                        key={sort.fieldKey}
                                        role="group"
                                        className="flex min-w-0 items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200"
                                    >
                                        <span className="min-w-0 grow break-words text-start [overflow-wrap:anywhere]">
                                            {sort.fieldName}
                                        </span>

                                        <ul className="flex flex-none gap-x-2">
                                            <li>
                                                <input
                                                    id={`asc-${sort.fieldKey}`}
                                                    type="checkbox"
                                                    className="hidden peer"
                                                    checked={current?.operation === "asc"}
                                                    onChange={() => {
                                                        updateSorts({
                                                            field: sort.fieldKey,
                                                            operation: "asc",
                                                            doClear: current?.operation === "asc",
                                                        });
                                                    }}
                                                />
                                                <label htmlFor={`asc-${sort.fieldKey}`} className={radioLabel}>
                                                    <BarsArrowUpIcon className="h-5 w-5"/>
                                                </label>
                                            </li>

                                            <li>
                                                <input
                                                    id={`desc-${sort.fieldKey}`}
                                                    type="checkbox"
                                                    className="hidden peer"
                                                    checked={current?.operation === "desc"}
                                                    onChange={() => {
                                                        updateSorts({
                                                            field: sort.fieldKey,
                                                            operation: "desc",
                                                            doClear: current?.operation === "desc",
                                                        });
                                                    }}
                                                />
                                                <label htmlFor={`desc-${sort.fieldKey}`} className={radioLabel}>
                                                    <BarsArrowDownIcon className="h-5 w-5"/>
                                                </label>
                                            </li>
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    </FloatingFocusManager>
                </FloatingPortal>
            )}
        </div>
    );
}
