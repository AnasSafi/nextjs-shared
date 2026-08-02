"use client";

import {
    autoUpdate,
    flip,
    FloatingFocusManager,
    FloatingPortal,
    hide,
    offset,
    shift,
    size,
    useClick,
    useDismiss,
    useFloating,
    useId,
    useInteractions,
    useRole,
    type Placement,
} from "@floating-ui/react";
import {useEffect, useMemo, useState} from "react";

const VIEWPORT_PADDING = 8;
const TRIGGER_OFFSET = 8;

export {FloatingFocusManager, FloatingPortal};

export function getElementDirection(element: HTMLElement | null): "ltr" | "rtl" {
    if (typeof document === "undefined") return "ltr";

    const computedDirection = element ? getComputedStyle(element).direction : "";
    const closestDir = element?.closest<HTMLElement>("[dir]")?.dir;
    const documentElementDir = document.documentElement?.dir;
    const bodyDir = document.body?.dir;

    const direction = [
        computedDirection,
        closestDir,
        documentElementDir,
        bodyDir,
    ].find((value): value is string => value === "rtl" || value === "ltr");

    return direction === "rtl" ? "rtl" : "ltr";
}

export function getLogicalEndPlacement(): Placement {
    return "bottom-end";
}

export type UseTableFloatingMenuArgs = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    placement?: Placement;
    viewportPadding?: number;
    triggerOffset?: number;
};

export function useTableFloatingMenu(
    {
        open,
        onOpenChange,
        placement = getLogicalEndPlacement(),
        viewportPadding = VIEWPORT_PADDING,
        triggerOffset = TRIGGER_OFFSET,
    }: UseTableFloatingMenuArgs,
) {
    const triggerId = useId();
    const menuId = useId();
    const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");

    const middleware = useMemo(
        () => [
            offset(triggerOffset),
            flip({padding: viewportPadding}),
            shift({padding: viewportPadding}),
            size({
                padding: viewportPadding,
                apply({availableWidth, availableHeight, elements}) {
                    Object.assign(elements.floating.style, {
                        maxWidth: `${Math.max(0, Math.floor(availableWidth))}px`,
                        maxHeight: `${Math.max(0, Math.floor(availableHeight))}px`,
                    });
                },
            }),
            hide({padding: viewportPadding}),
        ],
        [triggerOffset, viewportPadding],
    );

    const floating = useFloating({
        open,
        onOpenChange,
        placement,
        strategy: "fixed",
        whileElementsMounted: (reference, floatingElement, update) =>
            autoUpdate(reference, floatingElement, update, {
                ancestorResize: true,
                ancestorScroll: true,
                elementResize: true,
                layoutShift: true,
            }),
        middleware,
    });

    const click = useClick(floating.context);
    const dismiss = useDismiss(floating.context, {
        outsidePressEvent: "mousedown",
        referencePress: false,
    });
    const role = useRole(floating.context, {role: "menu"});
    const interactions = useInteractions([click, dismiss, role]);

    useEffect(() => {
        const reference = floating.refs.reference.current;
        setDirection(getElementDirection(reference instanceof HTMLElement ? reference : null));
    }, [floating.refs.reference, open]);

    useEffect(() => {
        if (open && floating.middlewareData.hide?.referenceHidden) {
            const reference = floating.refs.reference.current;
            if (!(reference instanceof HTMLElement)) {
                onOpenChange(false);
                return;
            }

            const rect = reference.getBoundingClientRect();
            const isFullyOutsideViewport =
                rect.width <= 0 ||
                rect.height <= 0 ||
                rect.bottom < 0 ||
                rect.right < 0 ||
                rect.top > window.innerHeight ||
                rect.left > window.innerWidth;

            if (isFullyOutsideViewport) {
                onOpenChange(false);
            }
        }
    }, [floating.middlewareData.hide?.referenceHidden, floating.refs.reference, onOpenChange, open]);

    return {
        ...floating,
        ...interactions,
        triggerId,
        menuId,
        direction,
        close: () => onOpenChange(false),
    };
}
