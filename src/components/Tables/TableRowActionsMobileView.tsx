"use client";

import React, {
    Fragment,
    type JSX,
    type ReactElement,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";
import {createPortal} from "react-dom";
import {useClickAway} from "react-use";
import clsx from "clsx";
import {ChevronDownIcon} from "@heroicons/react/24/solid";

type WithClassName = { className?: string };

export type TableRowActionsMobileViewProps = {
    actions: ReactNode[];
    label: ReactNode;
    portalRootId?: string;
};

function usePortalRoot(id: string): HTMLElement | null {
    const [root, setRoot] = useState<HTMLElement | null>(null);

    useEffect((): void => {
        let el: HTMLElement | null = document.getElementById(id);
        if (!el) {
            el = document.createElement("div");
            el.id = id;
            document.body.appendChild(el);
        }
        setRoot(el);
    }, [id]);

    return root;
}

export default function TableRowActionsMobileView(
    {
        actions,
        label,
        portalRootId = "dropdown-root",
    }: TableRowActionsMobileViewProps,
): JSX.Element {

    const [open, setOpen] = useState(false);

    const btnRef: React.RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement>(null);
    const menuRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);

    const portalRoot: HTMLElement | null = usePortalRoot(portalRootId);

    useClickAway(menuRef, (): void => setOpen(false));

    useEffect((): () => void => {
        const esc = (e: KeyboardEvent): false | void => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", esc);
        return (): void => document.removeEventListener("keydown", esc);
    }, []);

    useEffect((): undefined | (() => void) => {
        if (!open) return;

        const close: () => void = () => setOpen(false);
        window.addEventListener("scroll", close, {passive: true});
        window.addEventListener("resize", close);

        return (): void => {
            window.removeEventListener("scroll", close);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

    useEffect((): void => {
        if (open && btnRef.current) {
            const r: DOMRect = btnRef.current.getBoundingClientRect();
            setCoords({
                top: r.bottom + 4,
                left: document.dir === "rtl" ? r.right - 180 : r.left,
            });
        }
    }, [open]);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(): void => setOpen((v: boolean): boolean => !v)}
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

            {open && portalRoot &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        style={{top: coords?.top, left: coords?.left}}
                        onClick={() => setTimeout((): void => setOpen(false), 0)}
                        className={clsx(
                            "fixed z-[1000] min-w-[11rem] max-w-[calc(100vw-2rem)] max-h-60",
                            "origin-top-right overflow-y-auto rounded-md p-0.5 space-y-1",
                            "bg-white dark:bg-gray-900 shadow-xl shadow-black/10 dark:shadow-black/40",
                            "animate-fade-in",
                        )}
                    >
                        {actions.map((action: ReactNode, i: number): JSX.Element => (
                            <Fragment key={i}>
                                {React.isValidElement(action)
                                    ? React.cloneElement(action as ReactElement<WithClassName>, {
                                        className: clsx(
                                            (action.props as WithClassName).className,
                                            "block w-full text-start px-4 py-2 rounded-md",
                                            "active:scale-[.97] transition duration-75",
                                        ),
                                    } as WithClassName)
                                    : action}
                            </Fragment>
                        ))}
                    </div>,
                    portalRoot,
                )}
        </>
    );
}
