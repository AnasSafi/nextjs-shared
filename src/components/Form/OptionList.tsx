"use client";

import {type JSX, type CSSProperties, type RefObject, type UIEvent, type MouseEvent, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import clsx from "clsx";
import Image from "next/image";
import {
    CheckIcon,
    PlusCircleIcon,
    XMarkIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import type {SelectOptionModel} from "../../models/core/dbModels";
import type {DropdownStrategy} from "./Helpers/ComboboxShared";

export interface OptionListProps {
    isOpen: boolean;
    strategy: DropdownStrategy;
    listRef: RefObject<HTMLUListElement | null>;
    fixedStyle?: CSSProperties;
    className?: string;
    onScroll: (e: UIEvent<HTMLUListElement>) => void;

    options: SelectOptionModel[];
    inProgress: boolean;
    emptyLabel: string;

    selectedIds: Set<string>;
    variant: "single" | "multiple";

    getLabel: (opt: SelectOptionModel) => string;
    onPick: (opt: SelectOptionModel) => void;

    imageForSelectedOnly?: boolean;
    LoaderSlot?: JSX.Element;

    listboxId: string;

    showCreateAction?: boolean;
    createActionLabel?: string;
    onCreateAction?: () => void;

    bulkActionLabel?: string;
    bulkActionIsSelect?: boolean;
    onBulkAction?: () => void;

    allowItemActions?: boolean;
    onEditOption?: (opt: SelectOptionModel) => void;
    onDeleteOption?: (opt: SelectOptionModel) => void;
    editLabel?: string;
    deleteLabel?: string;

    onMouseDownInside?: () => void;
}

export function OptionList(
    {
        isOpen,
        strategy,
        listRef,
        fixedStyle,
        className,
        onScroll,
        options,
        inProgress,
        emptyLabel,
        selectedIds,
        variant,
        getLabel,
        onPick,
        imageForSelectedOnly = false,
        LoaderSlot,
        listboxId,
        showCreateAction = false,
        createActionLabel,
        onCreateAction,
        bulkActionLabel,
        bulkActionIsSelect,
        onBulkAction,
        allowItemActions = false,
        onEditOption,
        onDeleteOption,
        editLabel = "Edit",
        deleteLabel = "Delete",
        onMouseDownInside,
    }: OptionListProps,
): JSX.Element | null {
    const [isClient, setIsClient] = useState<boolean>(false);

    useEffect(() => {
        setIsClient(true);
        return () => setIsClient(false);
    }, []);

    const baseMenuClasses =
        "max-h-56 overflow-auto rounded-md bg-gray-50 dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black/5 sm:text-sm";

    const stop = (e: MouseEvent) => e.stopPropagation();

    const fallbackSpinner: JSX.Element = (
        <span
            className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-500"
            aria-hidden="true"
        />
    );

    const loaderRow: JSX.Element = (
        <li
            role="option"
            aria-selected="false"
            className={clsx(
                "sticky bottom-0 z-10 cursor-default select-none py-2",
                "bg-gray-50/95 dark:bg-gray-700/95 backdrop-blur",
                "border-t border-gray-200/60 dark:border-gray-600/60",
            )}
        >
            <div className="flex items-center justify-center gap-2">
                {LoaderSlot ?? fallbackSpinner}
                <span className="sr-only">Loading</span>
            </div>
        </li>
    );

    const UL: JSX.Element = (
        <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-live="polite"
            aria-busy={inProgress}
            onScroll={onScroll}
            onMouseDown={(event) => {
                onMouseDownInside?.();
                if (variant === "multiple") event.preventDefault();
            }}
            onPointerDown={onMouseDownInside}
            className={clsx(baseMenuClasses, className)}
        >
            {bulkActionLabel && onBulkAction && (
                <li
                    role="option"
                    aria-selected="false"
                    onClick={onBulkAction}
                    className={clsx(
                        "relative cursor-pointer select-none py-2 ps-3 pe-9",
                        "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-600/40",
                    )}
                >
                    <div className="flex items-center gap-2">
                        {bulkActionIsSelect ? (
                            <CheckIcon className="h-5 w-5" aria-hidden />
                        ) : (
                            <XMarkIcon className="h-5 w-5" aria-hidden />
                        )}
                        <span className="truncate">{bulkActionLabel}</span>
                    </div>
                </li>
            )}

            {showCreateAction && (
                <li
                    role="option"
                    aria-selected="false"
                    onClick={onCreateAction}
                    className={clsx(
                        "relative cursor-pointer select-none py-2 ps-3 pe-9",
                        "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-600/40",
                    )}
                >
                    <div className="flex items-center gap-2">
                        <PlusCircleIcon className="h-5 w-5" aria-hidden />
                        <span className="truncate">{createActionLabel ?? "Add new…"}</span>
                    </div>
                </li>
            )}

            {options.length > 0 ? (
                <>
                    {options.map((opt: SelectOptionModel) => {
                        const isSelected = selectedIds.has(String(opt.id));
                        const showLeading = Boolean(opt.image && !imageForSelectedOnly);

                        return (
                            <li
                                key={opt.id}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => onPick(opt)}
                                className={clsx(
                                    "relative cursor-pointer select-none py-2 ps-3 pe-9 text-gray-900 dark:text-white group",
                                    variant === "multiple" && isSelected && "bg-gray-100 dark:bg-gray-600",
                                )}
                            >
                                <div className="flex items-center">
                                    {showLeading && opt.image && (
                                        <Image
                                            width={40}
                                            height={40}
                                            priority
                                            src={opt.image}
                                            alt=""
                                            className="h-6 w-6 shrink-0"
                                        />
                                    )}
                                    <span className={clsx("truncate", showLeading && "ms-3")}>
                                        {getLabel(opt)}
                                    </span>
                                </div>

                                {isSelected && (
                                    <span className="absolute inset-y-0 end-0 me-[2.25rem] flex items-center pe-2">
                                        <CheckIcon className="h-5 w-5 text-amber-600" aria-hidden />
                                    </span>
                                )}

                                {allowItemActions && (
                                    <span className="absolute inset-y-0 end-0 flex items-center pe-2 gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        {onEditOption && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    stop(e);
                                                    onEditOption(opt);
                                                }}
                                                className="rounded p-1 text-gray-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-gray-600/40"
                                                aria-label={editLabel}
                                                title={editLabel}
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                        {onDeleteOption && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    stop(e);
                                                    onDeleteOption(opt);
                                                }}
                                                className="rounded p-1 text-gray-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-gray-600/40"
                                                aria-label={deleteLabel}
                                                title={deleteLabel}
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </span>
                                )}
                            </li>
                        );
                    })}

                    {inProgress && loaderRow}
                </>
            ) : inProgress ? (
                <li className="relative cursor-default select-none py-2 ps-3 pr-9 text-gray-900 dark:text-white">
                    {LoaderSlot ?? fallbackSpinner}
                    <span className="sr-only">Loading</span>
                </li>
            ) : (
                <li className="relative cursor-default select-none py-2 ps-3 pr-9 text-gray-400">
                    {emptyLabel}
                </li>
            )}
        </ul>
    );

    if (strategy === "inline") {
        return (
            <div className={clsx(isOpen ? "block" : "hidden", "absolute z-[1200] mt-1 w-full rounded-md")}>
                {UL}
            </div>
        );
    }

    if (!isOpen) return null;
    if (!isClient) return null;
    if (!fixedStyle) return null;

    return createPortal(
        <div className="fixed z-[1200]" style={fixedStyle}>
            {UL}
        </div>,
        document.body,
    );
}

export default OptionList;
