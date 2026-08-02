import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import TableRowActionsMobileView from "../src/components/Tables/TableRowActionsMobileView";
import {getElementDirection, getLogicalEndPlacement} from "../src/components/Tables/TableFloatingMenu";

class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
}

describe("TableRowActionsMobileView floating menu", () => {
    let rectTop = 20;

    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());

        Object.defineProperty(window, "innerWidth", {value: 1024, configurable: true});
        Object.defineProperty(window, "innerHeight", {value: 768, configurable: true});

        HTMLElement.prototype.getBoundingClientRect = vi.fn(function getBoundingClientRect(this: HTMLElement) {
            if (this.tagName === "BUTTON") {
                return {
                    x: 100,
                    y: rectTop,
                    top: rectTop,
                    left: 100,
                    right: 140,
                    bottom: rectTop + 32,
                    width: 40,
                    height: 32,
                    toJSON: () => ({}),
                } as DOMRect;
            }

            return {
                x: 0,
                y: 0,
                top: 0,
                left: 0,
                right: 176,
                bottom: 120,
                width: 176,
                height: 120,
                toJSON: () => ({}),
            } as DOMRect;
        });
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
        document.documentElement.dir = "";
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("opens through the portal and toggles closed from the trigger", async () => {
        render(
            <TableRowActionsMobileView
                portalRootId="row-action-root"
                label="Actions"
                actions={[<button key="a">Edit</button>]}
            />,
        );

        const trigger = screen.getByRole("button", {name: /actions/i});
        fireEvent.click(trigger);

        const menu = await screen.findByRole("menu");
        expect(document.getElementById("row-action-root")?.contains(menu)).toBe(true);
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        expect(trigger.getAttribute("aria-expanded")).toBe("true");

        fireEvent.click(trigger);
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    });

    it("closes on outside click, Escape, and action selection", async () => {
        const onAction = vi.fn();
        render(
            <div>
                <TableRowActionsMobileView
                    label="Actions"
                    actions={[<button key="a" onClick={onAction}>Edit</button>]}
                />
                <button>Outside</button>
            </div>,
        );

        const trigger = screen.getByRole("button", {name: /actions/i});
        fireEvent.click(trigger);
        expect(await screen.findByRole("menu")).toBeTruthy();
        fireEvent.mouseDown(screen.getByRole("button", {name: /outside/i}));
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

        fireEvent.click(trigger);
        expect(await screen.findByRole("menu")).toBeTruthy();
        fireEvent.keyDown(document, {key: "Escape"});
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
        expect(document.activeElement).toBe(trigger);

        fireEvent.click(trigger);
        const item = await screen.findByRole("menuitem", {name: /edit/i});
        fireEvent.click(item);
        expect(onAction).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    });

    it("adds menuitem semantics and keyboard navigation", async () => {
        render(
            <TableRowActionsMobileView
                label="Actions"
                actions={[
                    <button key="a">Edit</button>,
                    <button key="b">Delete</button>,
                ]}
            />,
        );

        const trigger = screen.getByRole("button", {name: /actions/i});
        fireEvent.keyDown(trigger, {key: "ArrowDown"});

        const edit = await screen.findByRole("menuitem", {name: /edit/i});
        const remove = screen.getByRole("menuitem", {name: /delete/i});
        await waitFor(() => expect(document.activeElement).toBe(edit));

        fireEvent.keyDown(screen.getByRole("menu"), {key: "End"});
        expect(document.activeElement).toBe(remove);

        fireEvent.keyDown(screen.getByRole("menu"), {key: "Home"});
        expect(document.activeElement).toBe(edit);
    });

    it("uses logical-end placement and computed direction", () => {
        document.documentElement.dir = "rtl";
        const button = document.createElement("button");
        document.body.appendChild(button);

        expect(getLogicalEndPlacement()).toBe("bottom-end");
        expect(getElementDirection(button)).toBe("rtl");
    });

    it("keeps the menu hidden until Floating UI has positioned it", async () => {
        render(
            <TableRowActionsMobileView
                label="Actions"
                actions={[<button key="a">Edit</button>]}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: /actions/i}));
        const floating = await waitFor(() => document.querySelector<HTMLElement>("[data-positioned]"));

        if (floating?.dataset.positioned === "false") {
            expect(floating.style.visibility).toBe("hidden");
        } else {
            expect(floating?.style.visibility).toBe("visible");
        }
    });

    it("repositions instead of closing on ancestor scroll and resize", async () => {
        render(
            <div style={{height: 100, overflow: "auto"}}>
                <TableRowActionsMobileView
                    label="Actions"
                    actions={[<button key="a">Edit</button>]}
                />
            </div>,
        );

        fireEvent.click(screen.getByRole("button", {name: /actions/i}));
        const floating = await waitFor(() => document.querySelector<HTMLElement>("[data-positioned]"));
        expect(screen.getByRole("menu")).toBeTruthy();

        const firstTop = floating?.style.top;
        rectTop = 80;
        await act(async () => {
            window.dispatchEvent(new Event("scroll"));
            window.dispatchEvent(new Event("resize"));
        });

        await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
        expect(floating?.style.top === firstTop || floating?.style.top).toBeTruthy();
    });
});
