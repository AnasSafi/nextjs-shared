import React from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {PaginationControls} from "../src/components/Tables/PaginationControls";

afterEach(cleanup);

describe("PaginationControls", () => {
    it("marks only the current page and preserves page navigation", () => {
        const onChange = vi.fn();
        render(<PaginationControls themeColor="purple" current={2} total={3} onChange={onChange} />);
        const current = screen.getByRole("button", {name: "2"});
        expect(current.getAttribute("aria-current")).toBe("page");
        expect(current.classList.contains("bg-purple-600")).toBe(true);
        expect(current.classList.contains("dark:bg-purple-700")).toBe(true);
        const other = screen.getByRole("button", {name: "3"});
        expect(other.getAttribute("aria-current")).toBeNull();
        expect(other.classList.contains("bg-purple-600")).toBe(false);
        fireEvent.click(other);
        expect(onChange).toHaveBeenCalledExactlyOnceWith(3);
    });

    it("uses the selected theme for enabled next/previous controls", () => {
        const onChange = vi.fn();
        render(<PaginationControls themeColor="teal" mode="nextPrev" current={2} hasNext onChange={onChange} labels={{previous: "Previous", next: "Next"}} />);
        for (const name of ["Previous", "Next"]) {
            const button = screen.getByRole("button", {name});
            expect(button.classList.contains("bg-teal-600")).toBe(true);
            expect(button.classList.contains("dark:bg-teal-700")).toBe(true);
            fireEvent.click(button);
        }
        expect(onChange.mock.calls).toEqual([[1], [3]]);
    });

    it.each(["unknown-color", "", "constructor", "__proto__"])("falls back safely for %j", (themeColor) => {
        render(<PaginationControls themeColor={themeColor} current={1} total={2} onChange={vi.fn()} />);
        const current = screen.getByRole("button", {name: "1"});
        expect(current.classList.contains("bg-purple-600")).toBe(true);
        expect(current.classList.contains("dark:bg-purple-700")).toBe(true);
    });

    it("does not activate disabled next/previous controls", () => {
        const onChange = vi.fn();
        render(<PaginationControls themeColor="purple" mode="nextPrev" current={2} hasNext disabled onChange={onChange} labels={{previous: "Previous", next: "Next"}} />);
        for (const button of screen.getAllByRole("button")) {
            expect(button.hasAttribute("disabled")).toBe(true);
            expect(button.classList.contains("bg-purple-600")).toBe(false);
            expect(button.classList.contains("bg-gray-200")).toBe(true);
            fireEvent.click(button);
        }
        expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps the selected page visible while navigation is disabled", () => {
        const onChange = vi.fn();
        render(<PaginationControls themeColor="purple" current={1} total={2} disabled onChange={onChange} />);
        const current = screen.getByRole("button", {name: "1"});
        expect(current.classList.contains("bg-purple-600")).toBe(true);
        expect(current.classList.contains("opacity-50")).toBe(true);
        fireEvent.click(screen.getByRole("button", {name: "2"}));
        expect(onChange).not.toHaveBeenCalled();
    });
});
