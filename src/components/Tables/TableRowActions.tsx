"use client";

import React, {type JSX, useMemo} from "react";
import Link from "next/link";
import type {ButtonVariant, RowAction, RowVariant} from "../../models/ui/tableModels";
import type {TranslateFn} from "../../models/core/localeModels";
import TableRowActionsMobileView from "./TableRowActionsMobileView";

export type TableRowActionsDisplayMode = "auto" | "table" | "card";

export type TableRowActionsProps<R> = {
    /** Row object received from <TableView>/<CardView>. */
    row: R & { actions?: RowAction<R>[]; variant?: RowVariant | null };
    /** UI-only actions (type = clientButton | clientLink). */
    clientRowActions?: RowAction<R>[];
    /** Lookup table used when a serverButton specifies clientHandler. */
    handlerMap?: Record<string, (row: R) => void | Promise<void>>;
    /** Optional translation function provided by the consumer. */
    t: TranslateFn;
    displayMode?: TableRowActionsDisplayMode;
};

const variantClass = (variant: ButtonVariant | undefined): string =>
    ({
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-600 text-white hover:bg-gray-700",
        success: "bg-green-600 text-white hover:bg-green-700",
        info: "bg-cyan-600 text-white hover:bg-cyan-700",
        warning: "bg-yellow-500 text-black hover:bg-yellow-600",
        danger: "bg-red-600 text-white hover:bg-red-700",
        light: "bg-gray-100 text-black hover:bg-gray-200",
        dark: "bg-gray-900 text-white hover:bg-gray-800",
        link: "text-blue-600 underline hover:text-blue-800",
    }[variant ?? "primary"]);

export default function TableRowActions<R>(props: TableRowActionsProps<R>): JSX.Element | null {
    const {
        row,
        clientRowActions = [],
        handlerMap = {},
        t,
        displayMode = "auto",
    } = props;

    const mergedActions: RowAction<R>[] = useMemo(() => {
        if (!row.actions) return [];

        const clientMap = new Map(
            clientRowActions
                .filter(
                    (clientAction): clientAction is Extract<
                        RowAction<R>,
                        { type: "clientButton" | "clientLink" }
                    > => clientAction.type === "clientButton" || clientAction.type === "clientLink",
                )
                .map((clientAction) => [clientAction.key, clientAction]),
        );

        return row.actions.map<RowAction<R>>((serverAction) => {
            const clientAction = clientMap.get(serverAction.key);
            const click = clientAction && "onClick" in clientAction ? clientAction.onClick : undefined;

            if (serverAction.type === "serverLink") {
                return {
                    type: "clientLink",
                    key: serverAction.key,
                    href: serverAction.href,
                    onClick: click,
                    label: clientAction?.label ?? serverAction.label,
                    variant: clientAction?.variant ?? serverAction.variant,
                    style: clientAction?.style ?? serverAction.style,
                };
            }

            if (serverAction.type === "serverButton") {
                return {
                    type: "clientButton",
                    key: serverAction.key,
                    label: clientAction?.label ?? serverAction.label,
                    onClick:
                        click ??
                        ((rowArg: R) => {
                            if (serverAction.clientHandler && handlerMap[serverAction.clientHandler]) {
                                return handlerMap[serverAction.clientHandler](rowArg);
                            }
                        }),
                    variant: clientAction?.variant ?? serverAction.variant,
                    style: clientAction?.style ?? serverAction.style,
                };
            }

            return serverAction;
        });
    }, [clientRowActions, handlerMap, row.actions]);

    if (mergedActions.length === 0) return null;

    const renderAction = (action: RowAction<R>, idx: number): JSX.Element => {
        const spacingClass = displayMode === "auto" ? "mt-1 mb-1" : "";
        const className = [
            "rounded-md px-3 py-2 text-sm font-semibold shadow-xs whitespace-nowrap",
            spacingClass,
            variantClass(action.variant),
        ].join(" ");

        if (action.type === "clientLink" || action.type === "serverLink") {
            return (
                <Link
                    key={idx}
                    href={action.href}
                    style={action.style}
                    onClick={async (event) => {
                        if (action.type === "clientLink" && action.onClick) {
                            event.preventDefault();
                            await action.onClick(props.row);
                        }
                    }}
                    className={className}
                >
                    {action.label}
                </Link>
            );
        }

        const clickHandler = async (): Promise<void> => {
            if ("onClick" in action && typeof action.onClick === "function") {
                await action.onClick(props.row);
                return;
            }

            if (
                "clientHandler" in action &&
                action.clientHandler &&
                handlerMap[action.clientHandler]
            ) {
                await handlerMap[action.clientHandler](props.row);
            }
        };

        return (
            <button
                key={idx}
                type="button"
                onClick={clickHandler}
                style={action.style}
                className={className}
            >
                {action.label}
            </button>
        );
    };

    const shouldUseDropdown =
        displayMode === "table"
            ? mergedActions.length > 1
            : mergedActions.length > 2;

    if (shouldUseDropdown) {
        return (
            <TableRowActionsMobileView
                actions={mergedActions.map(renderAction)}
                label={t("actions")}
            />
        );
    }

    const inlineClassName =
        displayMode === "table"
            ? "flex flex-row-reverse flex-nowrap justify-center gap-2"
            : displayMode === "card"
                ? "flex flex-row-reverse flex-wrap justify-center gap-2"
                : "mt-4 flex flex-row-reverse flex-wrap justify-center gap-2";

    return (
        <div className={inlineClassName}>
            {mergedActions.map(renderAction)}
        </div>
    );
}
