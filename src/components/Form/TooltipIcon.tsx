"use client";
import React, {useState, useRef, useEffect, JSX} from "react";
import {createPortal} from "react-dom";
import {BsQuestion, BsFillClockFill, BsFillCursorFill} from "react-icons/bs";

interface TooltipIconProps {
    tipText: string;
    icon?: string;
}

export default function TooltipIcon({tipText, icon}: TooltipIconProps): JSX.Element {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipX, setTooltipX] = useState(0);
    const [tooltipY, setTooltipY] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const updateTooltipPosition = () => {
        if (!buttonRef.current) return;

        const rect: DOMRect = buttonRef.current.getBoundingClientRect();
        const tooltipWidth = 300;
        const padding = 8;

        let left: number = rect.left + rect.width / 2;
        const top: number = rect.top - padding;

        const viewportWidth = window.innerWidth;

        if (left + tooltipWidth / 2 > viewportWidth - padding) {
            left = viewportWidth - tooltipWidth / 2 - padding;
        }

        if (left - tooltipWidth / 2 < padding) {
            left = tooltipWidth / 2 + padding;
        }

        setTooltipX(left);
        setTooltipY(top);
    };

    const showTooltip: () => void = (): void => {
        updateTooltipPosition();
        setIsVisible(true);
    };

    const hideTooltip: () => void = (): void => {
        setIsVisible(false);
    };

    useEffect((): void => {
        if (isVisible) {
            updateTooltipPosition();
        }
    }, [isVisible]);

    useEffect((): undefined | (() => void) => {
        if (!isVisible) return;

        const handleScroll: () => void = (): void => {
            setIsVisible(false);
            buttonRef.current?.blur();
        };

        window.addEventListener("scroll", handleScroll, true);

        return (): void => {
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [isVisible]);

    return (
        <>
            <div className="inline-flex items-center relative">
                <button
                    tabIndex={-1}
                    ref={buttonRef}
                    onMouseOver={showTooltip}
                    onFocus={showTooltip}
                    onBlur={hideTooltip}
                    onMouseOut={hideTooltip}
                    type="button"
                    className="ms-2 text-white dark:text-neutral-900 dark:hover:text-yellow-800 text-xs bg-gray-600 hover:bg-gray-500 focus:ring-2 focus:outline-hidden focus:ring-blue-600 font-normal rounded-full w-4 h-4 flex items-center justify-center dark:bg-gray-300 dark:hover:bg-amber-400 dark:focus:ring-blue-800"
                >
                    {!icon && <BsQuestion className="transform rtl:-scale-x-100"/>}
                    {icon === "BsFillClockFill" && <BsFillClockFill className="transform rtl:-scale-x-100"/>}
                    {icon === "BsFillCursorFill" && <BsFillCursorFill className="transform rtl:-scale-x-100"/>}
                </button>
            </div>

            {isVisible &&
                typeof window !== "undefined" &&
                createPortal(
                    <div
                        role="tooltip"
                        dir="auto"
                        className="fixed z-50 px-3 py-2 text-sm font-medium text-white
                                   bg-gray-800 rounded-md shadow-xl text-start whitespace-normal break-words
                                   min-w-[220px] max-w-[300px] leading-relaxed
                                   border border-gray-600"
                        style={{
                            top: tooltipY,
                            left: tooltipX,
                            transform: "translate(-50%, -100%)",
                        }}
                    >
                        {tipText}
                    </div>,
                    document.body
                )}
        </>
    );
};
