"use client";

import React, {
    Fragment,
    type JSX,
    type ReactElement,
    type ReactNode,
    type KeyboardEvent,
    type MouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import clsx from "clsx";
import {ChevronDownIcon} from "@heroicons/react/24/solid";
import {
    FloatingFocusManager,
    FloatingPortal,
    useTableFloatingMenu,
} from "./TableFloatingMenu";

type ActionElementProps = {
    className?: string;
    disabled?: boolean;
    role?: string;
    tabIndex?: number;
    onClick?: (event: MouseEvent<HTMLElement>) => void | Promise<void>;
    "aria-disabled"?: boolean | "true" | "false";
};

export type TableRowActionsMobileViewProps = {
    actions: ReactNode[];
    label: ReactNode;
    portalRootId?: string;
};

export default function TableRowActionsMobileView(
    {
        actions,
        label,
        portalRootId = "dropdown-root",
    }: TableRowActionsMobileViewProps,
): JSX.Element {

    const [open, setOpen] = useState(false);
    const menuRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
    const pendingInitialFocusRef = useRef<"first" | "last" | null>(null);

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
        close,
    } = useTableFloatingMenu({
        open,
        onOpenChange: setOpen,
    });

    const getMenuItems = useCallback((): HTMLElement[] => {
        const menu = menuRef.current;
        if (!menu) return [];

        return Array.from(
            menu.querySelectorAll<HTMLElement>(
                '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)',
            ),
        ).filter((element) => element.tabIndex >= 0);
    }, []);

    const focusMenuItem = useCallback((position: "first" | "last" | number): void => {
        const items = getMenuItems();
        if (items.length === 0) return;

        if (position === "first") {
            items[0].focus();
            return;
        }

        if (position === "last") {
            items[items.length - 1].focus();
            return;
        }

        items[Math.min(Math.max(position, 0), items.length - 1)].focus();
    }, [getMenuItems]);

    const openAndFocus = useCallback((position: "first" | "last"): void => {
        pendingInitialFocusRef.current = position;
        setOpen(true);
    }, []);

    useEffect(() => {
        if (!open || !pendingInitialFocusRef.current) return;

        const position = pendingInitialFocusRef.current;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const frame = requestAnimationFrame((): void => {
            timer = setTimeout((): void => {
                focusMenuItem(position);
                pendingInitialFocusRef.current = null;
            }, 0);
        });

        return () => {
            cancelAnimationFrame(frame);
            if (timer) clearTimeout(timer);
        };
    }, [focusMenuItem, open]);

    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            openAndFocus("first");
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            openAndFocus("last");
        }
    };

    const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        const items = getMenuItems();
        if (items.length === 0) return;

        const currentIndex = items.findIndex((item) => item === document.activeElement);

        if (event.key === "ArrowDown") {
            event.preventDefault();
            focusMenuItem(currentIndex < 0 ? 0 : (currentIndex + 1) % items.length);
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            focusMenuItem(currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length);
        }

        if (event.key === "Home") {
            event.preventDefault();
            focusMenuItem("first");
        }

        if (event.key === "End") {
            event.preventDefault();
            focusMenuItem("last");
        }
    };

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                id={triggerId}
                aria-controls={open ? menuId : undefined}
                {...getReferenceProps({
                    "aria-haspopup": "menu",
                    "aria-expanded": open,
                    onKeyDown: handleTriggerKeyDown,
                })}
                className={clsx(
                    "inline-flex items-center gap-2 rounded-md",
                    "px-4 py-2 text-sm font-medium shadow focus:outline-none",

                    "bg-black text-white hover:bg-gray-800",
                    "dark:bg-white dark:text-black dark:hover:bg-gray-200",

                    "focus-visible:ring focus-visible:ring-offset-2",
                    "focus-visible:ring-gray-800 dark:focus-visible:ring-white",

                    "active:scale-95 transition-transform",
                )}
            >
                {label}
                <ChevronDownIcon className="h-5 w-5"/>
            </button>

            {open && (
                <FloatingPortal id={portalRootId}>
                    <FloatingFocusManager
                        context={context}
                        modal={false}
                        initialFocus={-1}
                        returnFocus={true}
                    >
                        <div
                            ref={refs.setFloating}
                            style={{
                                ...floatingStyles,
                                visibility: isPositioned ? "visible" : "hidden",
                            }}
                            dir={direction}
                            data-positioned={isPositioned ? "true" : "false"}
                            className="z-[1000] min-w-[11rem] w-max max-w-[calc(100vw-1rem)]"
                        >
                            <div
                                ref={menuRef}
                                id={menuId}
                                {...getFloatingProps({
                                    role: "menu",
                                    "aria-labelledby": triggerId,
                                    onKeyDown: handleMenuKeyDown,
                                })}
                                onClick={() => setTimeout(close, 0)}
                                style={{maxWidth: "inherit", maxHeight: "inherit"}}
                                className={clsx(
                                    "max-w-full min-w-[11rem] overflow-y-auto overscroll-contain rounded-md p-0.5 space-y-1",
                                    "bg-white dark:bg-gray-900 shadow-xl shadow-black/10 dark:shadow-black/40",
                                    "ring-1 ring-black/5 dark:ring-white/10",
                                    "animate-fade-in",
                                )}
                            >
                                {actions.map((action: ReactNode, i: number): JSX.Element => {
                                    if (!React.isValidElement(action)) {
                                        return <Fragment key={i}>{action}</Fragment>;
                                    }

                                    const element = action as ReactElement<ActionElementProps>;
                                    const props = element.props;
                                    const disabled = props.disabled || props["aria-disabled"] === true || props["aria-disabled"] === "true";

                                    return (
                                        <Fragment key={i}>
                                            {React.cloneElement(element, {
                                                role: props.role ?? "menuitem",
                                                tabIndex: disabled ? -1 : 0,
                                                "aria-disabled": disabled ? true : props["aria-disabled"],
                                                onClick: async (event: MouseEvent<HTMLElement>): Promise<void> => {
                                                    await props.onClick?.(event);
                                                    close();
                                                },
                                                className: clsx(
                                                    props.className,
                                                    "flex w-full max-w-full items-center justify-start px-4 py-2 text-start",
                                                    "rounded-md text-sm whitespace-normal break-words [overflow-wrap:anywhere]",
                                                    "active:scale-[.97] transition duration-75",
                                                ),
                                            })}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </FloatingFocusManager>
                </FloatingPortal>
            )}
        </>
    );
}
