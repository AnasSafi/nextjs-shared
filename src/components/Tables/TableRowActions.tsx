"use client";

import React, {
    type JSX,
    type RefObject,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type {RowAction} from "../../models/ui/tableModels";
import type {RowVariant} from "../../models/ui/tableModels";
import type {ButtonVariant} from "../../models/ui/tableModels";
import TableRowActionsMobileView from "./TableRowActionsMobileView";
import Link from "next/link";
import {TranslateFn} from "../../models/core/localeModels";

export type TableRowActionsProps<R> = {
    /** Row object received from <TableView>/<CardView> */
    row: R & { actions?: RowAction<R>[]; variant?: RowVariant | null };
    /** UI-only actions (type = clientButton | clientLink) */
    clientRowActions?: RowAction<R>[];
    /** A lookup table used when a serverButton specifies clientHandler */
    handlerMap?: Record<string, (row: R) => void | Promise<void>>;
    /** Optional translation function (consumer provides it) */
    t: TranslateFn;
};

/* Maps ButtonVariant → Tailwind utility classes */
const variantClass = (v: ButtonVariant | undefined): string =>
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
    }[v ?? "primary"]);

export default function TableRowActions<R>(props: TableRowActionsProps<R>): JSX.Element {
    const {row, clientRowActions = [], handlerMap = {}, t} = props;

    const [open, setOpen] = useState(false);
    const dropRef: RefObject<HTMLDivElement | null> = useRef(null);

    /* ------------------------------------------------------------------
     * Merge backend actions with UI actions
     * – Only actions coming from the backend are rendered.
     * – If a UI action (same key) exists, its props override the server’s.
     * – Resulting actions are always clientButton / clientLink.
     * -----------------------------------------------------------------*/
    const mergedActions: RowAction<R>[] = useMemo(() => {
        if (!row.actions) return [];

        // Map UI actions by key (clientButton / clientLink only)
        const clientMap = new Map(
            clientRowActions
                .filter(
                    (c): c is Extract<
                        RowAction<R>,
                        { type: "clientButton" | "clientLink" }
                    > => c.type === "clientButton" || c.type === "clientLink",
                )
                .map((c) => [c.key, c]),
        );

        return row.actions.map<RowAction<R>>((srv) => {
            const client = clientMap.get(srv.key);

            // onClick helper (may be undefined)
            const click =
                client && "onClick" in client ? client.onClick : undefined;

            /* serverLink → clientLink */
            if (srv.type === "serverLink") {
                return {
                    type: "clientLink",
                    key: srv.key,
                    href: srv.href,
                    onClick: click,
                    label: client?.label ?? srv.label,
                    variant: client?.variant ?? srv.variant,
                    style: client?.style ?? srv.style,
                };
            }

            /* serverButton → clientButton */
            if (srv.type === "serverButton") {
                return {
                    type: "clientButton",
                    key: srv.key,
                    label: client?.label ?? srv.label,
                    onClick:
                        click ??
                        ((row: R) => {
                            if (srv.clientHandler && handlerMap[srv.clientHandler]) {
                                return handlerMap[srv.clientHandler](row);
                            }
                        }),
                    variant: client?.variant ?? srv.variant,
                    style: client?.style ?? srv.style,
                };
            }

            /* If the server already sent a *client action* just return it */
            return srv;
        });
    }, [row.actions, clientRowActions, handlerMap]);

    /* ------------------------------------------------------------------
     * Close dropdown when user clicks outside
     * -----------------------------------------------------------------*/
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (!dropRef.current || dropRef.current.contains(e.target as Node))
                return;
            setOpen(false);
        };
        window.addEventListener("mousedown", close);
        return () => window.removeEventListener("mousedown", close);
    }, [open]);

    /* ------------------------------------------------------------------
     * Render a single action (link / button)
     * -----------------------------------------------------------------*/
    const renderAction = (action: RowAction<R>, idx: number) => {
        const cls =
            "rounded-md px-3 py-2 mt-1 mb-1 text-sm font-semibold shadow-xs " +
            variantClass(action.variant);

        /* ---------- Links ---------- */
        if (action.type === "clientLink" || action.type === "serverLink") {
            return (
                <Link
                    key={idx}
                    href={action.href}
                    style={action.style}
                    onClick={async (e) => {
                        if (action.type === "clientLink" && action.onClick) {
                            e.preventDefault(); // run handler first
                            await action.onClick(props.row);
                        }
                        setOpen(false);
                    }}
                    className={cls}
                >
                    {action.label}
                </Link>
            );
        }

        /* ---------- Buttons ---------- */
        const clickHandler = async () => {
            // 1) prefer onClick if present
            if ("onClick" in action && typeof action.onClick === "function") {
                await action.onClick(props.row);

                // 2) fallback to clientHandler (server-originated button)
            } else if (
                "clientHandler" in action &&
                action.clientHandler &&
                handlerMap[action.clientHandler]
            ) {
                await handlerMap[action.clientHandler](props.row);
            }
            setOpen(false);
        };

        return (
            <button
                key={idx}
                type="button"
                onClick={clickHandler}
                style={action.style}
                className={cls}
            >
                {action.label}
            </button>
        );
    };

    /* ------------------------------------------------------------------ */
    /* JSX                                                                */
    /* ------------------------------------------------------------------ */

    /* > 2 actions → show dropdown */
    if (mergedActions.length > 2) {
        return (
            <TableRowActionsMobileView
                actions={mergedActions.map(renderAction)}
                label={t("actions")}
            />
        );
    }

    /* ≤ 2 actions → inline buttons / links */
    return (
        <div className="mt-4 flex flex-row-reverse flex-wrap justify-center gap-2">
            {mergedActions.map(renderAction)}
        </div>
    );
}