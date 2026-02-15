"use client";

import React, {type JSX, type KeyboardEvent, type PropsWithChildren, useRef} from "react";

/** Text-like, enabled, visible fields only */
const TEXTUAL_FIELDS_SELECTOR = [
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
    "textarea",
    "select",
]
    .map((s) => `${s}:not([disabled])`)
    .join(", ");

function isUsable(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (el.hasAttribute("data-skip-tab")) return false;
    if (el.tabIndex < 0) return false;
    const tag = el.tagName.toLowerCase();
    const include = el.hasAttribute("data-tab-include");
    const isInputish = tag === "input" || tag === "textarea" || tag === "select";
    return include || isInputish;
}

export type TabScopeProps = {
    loop?: boolean;
    className?: string;
    selector?: string;
};

export function TabScope(
    {
        loop = false,
        className,
        selector = TEXTUAL_FIELDS_SELECTOR,
        children,
    }: PropsWithChildren<TabScopeProps>,
): JSX.Element {
    const ref: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);

    const getFields = (): HTMLElement[] => {
        const root: HTMLDivElement | null = ref.current;
        if (!root) return [];
        return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(isUsable);
    };

    const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Tab") return;
        const target = e.target as HTMLElement;
        const fields = getFields();
        const idx = fields.indexOf(target);
        if (idx === -1) return;

        const step = e.shiftKey ? -1 : 1;
        let nextIdx = idx + step;

        if (nextIdx < 0 || nextIdx >= fields.length) {
            if (!loop) return;
            nextIdx = (nextIdx + fields.length) % fields.length;
        }

        e.preventDefault();
        const next = fields[nextIdx];
        next.focus();

        if (next instanceof HTMLInputElement) {
            const len = next.value?.length ?? 0;
            try {
                next.setSelectionRange?.(len, len);
            } catch {
                // ignore
            }
        }
    };

    return (
        <div
            ref={ref}
            data-tab-scope
            onKeyDownCapture={onKeyDownCapture}
            className={className}
        >
            {children}
        </div>
    );
}
