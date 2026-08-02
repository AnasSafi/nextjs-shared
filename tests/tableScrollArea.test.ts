import React from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, waitFor} from "@testing-library/react";
import TableScrollArea, {
    getNormalizedScrollLeft,
    getTableScrollState,
} from "../src/components/Tables/TableScrollArea";

function createScrollElement(scrollWidth: number, clientWidth: number, scrollLeft: number): HTMLElement {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollWidth", {value: scrollWidth, configurable: true});
    Object.defineProperty(element, "clientWidth", {value: clientWidth, configurable: true});
    Object.defineProperty(element, "scrollLeft", {value: scrollLeft, configurable: true});
    return element;
}

describe("table scroll state", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("detects no overflow", () => {
        const element = createScrollElement(300, 300, 0);
        expect(getTableScrollState(element, "ltr")).toEqual({
            hasOverflow: false,
            atLogicalStart: true,
            atLogicalEnd: true,
        });
    });

    it("detects overflow at logical start", () => {
        const element = createScrollElement(600, 300, 0);
        expect(getTableScrollState(element, "ltr")).toEqual({
            hasOverflow: true,
            atLogicalStart: true,
            atLogicalEnd: false,
        });
    });

    it("detects overflow in the middle", () => {
        const element = createScrollElement(600, 300, 150);
        expect(getTableScrollState(element, "ltr")).toEqual({
            hasOverflow: true,
            atLogicalStart: false,
            atLogicalEnd: false,
        });
    });

    it("detects overflow at logical end", () => {
        const element = createScrollElement(600, 300, 300);
        expect(getTableScrollState(element, "ltr")).toEqual({
            hasOverflow: true,
            atLogicalStart: false,
            atLogicalEnd: true,
        });
    });

    it("normalizes RTL negative scrollLeft", () => {
        const element = createScrollElement(600, 300, -300);
        expect(getNormalizedScrollLeft(element, "rtl")).toBe(300);
        expect(getTableScrollState(element, "rtl").atLogicalEnd).toBe(true);
    });

    it("normalizes RTL positive descending scrollLeft", () => {
        const element = createScrollElement(600, 300, 300);
        expect(getNormalizedScrollLeft(element, "rtl")).toBe(0);
        expect(getTableScrollState(element, "rtl").atLogicalStart).toBe(true);
    });

    it("isolates the table stacking context and keeps one horizontal scroll owner", () => {
        const {container} = render(
            React.createElement(
                TableScrollArea,
                {label: "Users"},
                React.createElement("table", null),
            ),
        );

        const wrapper = container.firstElementChild as HTMLElement;
        const scrollElement = container.querySelector("[data-table-scroll-area='true']");

        expect(wrapper.className).toContain("relative");
        expect(wrapper.className).toContain("isolate");
        expect(wrapper.className).toContain("z-0");
        expect(container.querySelectorAll("[data-table-scroll-area='true']").length).toBe(1);
        expect(scrollElement?.className).toContain("overflow-x-auto");
    });

    it("renders scroll shadows below sticky actions when overflow is in the middle", async () => {
        vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(600);
        vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
        vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockReturnValue(150);

        const {container} = render(
            React.createElement(
                TableScrollArea,
                {label: "Users"},
                React.createElement("table", null),
            ),
        );

        await waitFor(() => {
            expect(container.querySelector("[data-scroll-shadow='start']")).toBeTruthy();
            expect(container.querySelector("[data-scroll-shadow='end']")).toBeTruthy();
        });

        const startShadow = container.querySelector("[data-scroll-shadow='start']");
        const endShadow = container.querySelector("[data-scroll-shadow='end']");

        expect(startShadow?.className).toContain("z-[1]");
        expect(endShadow?.className).toContain("z-[1]");
        expect(startShadow?.className).toContain("pointer-events-none");
        expect(endShadow?.className).toContain("pointer-events-none");
    });
});
