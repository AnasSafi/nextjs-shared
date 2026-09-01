import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import ComboBoxCore from "../src/components/Form/ComboBoxCore";
import MultiSelectComboBoxCore, {
    type MultiSelectComboBoxCoreProps,
} from "../src/components/Form/MultiSelectComboBoxCore";
import type {BaseComboBoxInjected} from "../src/components/Form/BaseComboBoxCore";
import {useComboCore, type FetchComboPageFn} from "../src/hooks/formHooks/useComboCore";
import type {PaginationModel, SelectOptionModel} from "../src/models/core/dbModels";
import type {TranslateFn} from "../src/models/core/localeModels";

const A = option("a", "Alpha");
const B = option("b", "Beta");
const C = option("c", "Charlie");
const JORDAN = option("jo", "Jordan");
const LOCAL_OPTIONS = [A, B, C];

const t = ((key: string): string => key) as TranslateFn;
const localUseComboCore = useComboCore as BaseComboBoxInjected["useComboCore"];

function option(id: string, label: string): SelectOptionModel {
    return {id, name: {en: label}};
}

function pagination(
    data: SelectOptionModel[] = LOCAL_OPTIONS,
    getMorePath?: string,
): PaginationModel {
    return {
        data,
        pagination: {
            getMorePath,
            page: 1,
            pageSize: data.length,
            totalCount: data.length,
        },
    };
}

function injected(useCombo: BaseComboBoxInjected["useComboCore"] = localUseComboCore): BaseComboBoxInjected {
    return {
        t,
        currentLng: "en",
        useComboCore: useCombo,
    };
}

function multiElement(
    props: Partial<MultiSelectComboBoxCoreProps> = {},
    useCombo: BaseComboBoxInjected["useComboCore"] = localUseComboCore,
): React.ReactElement {
    return (
        <MultiSelectComboBoxCore
            {...injected(useCombo)}
            name="countries"
            pagination={pagination()}
            dropdownStrategy="inline"
            {...props}
        />
    );
}

function openInput(): HTMLInputElement {
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.focus(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    return input;
}

function pick(label: string): void {
    const row = screen.getByRole("option", {name: label});
    fireEvent.pointerDown(row);
    fireEvent.mouseDown(row);
    fireEvent.click(row);
}

function selectedLabels(): string[] {
    return screen.queryAllByRole("button", {name: "Remove"}).map((button) =>
        String(button.parentElement?.textContent ?? "").trim(),
    );
}

function emittedIds(onChange: ReturnType<typeof vi.fn>): string[][] {
    return onChange.mock.calls.map(([event]) => JSON.parse(event.target.value) as string[]);
}

function createRemoteUseComboCore(fetchPage: FetchComboPageFn): BaseComboBoxInjected["useComboCore"] {
    function useRemoteComboCore(config: Parameters<BaseComboBoxInjected["useComboCore"]>[0]) {
        return useComboCore({...config, fetchPage});
    }

    return useRemoteComboCore;
}

describe("MultiSelectComboBoxCore selection behavior", () => {
    beforeEach(() => {
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
            configurable: true,
            value: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("keeps the multiple dropdown open and the input focused after one selection", () => {
        render(multiElement());

        const input = openInput();
        pick("Alpha");

        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(document.activeElement).toBe(input);
        expect(selectedLabels()).toEqual(["Alpha"]);
    });

    it("stays open while selecting Alpha, Beta, and Charlie consecutively without resetting scroll", () => {
        render(multiElement());

        const input = openInput();
        const list = screen.getByRole("listbox");
        list.scrollTop = 37;

        pick("Alpha");
        pick("Beta");
        pick("Charlie");

        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(list.scrollTop).toBe(37);
        expect(selectedLabels()).toEqual(["Alpha", "Beta", "Charlie"]);
    });

    it("emits a complete ID snapshot after every consecutive selection", () => {
        const onChange = vi.fn();
        const onSelectionChange = vi.fn();
        render(multiElement({onChange, onSelectionChange}));

        openInput();
        pick("Alpha");
        pick("Beta");
        pick("Charlie");

        expect(emittedIds(onChange)).toEqual([
            ["a"],
            ["a", "b"],
            ["a", "b", "c"],
        ]);
        expect(onSelectionChange.mock.calls.map(([selected]) => selected.map((item: SelectOptionModel) => item.id))).toEqual([
            ["a"],
            ["a", "b"],
            ["a", "b", "c"],
        ]);
    });

    it("deselects Beta without closing and emits Alpha and Charlie", () => {
        const onChange = vi.fn();
        render(multiElement({onChange}));

        const input = openInput();
        pick("Alpha");
        pick("Beta");
        pick("Charlie");
        pick("Beta");

        expect(input.getAttribute("aria-expanded")).toBe("true");
        expect(emittedIds(onChange).at(-1)).toEqual(["a", "c"]);
        expect(selectedLabels()).toEqual(["Alpha", "Charlie"]);
    });

    it("still closes the single-select dropdown after a selection", () => {
        const onChange = vi.fn();
        render(
            <ComboBoxCore
                {...injected()}
                name="country"
                pagination={pagination()}
                dropdownStrategy="inline"
                onChange={onChange}
            />,
        );

        const input = openInput();
        pick("Alpha");

        expect(input.getAttribute("aria-expanded")).toBe("false");
        expect(input.value).toBe("Alpha");
        expect(onChange.mock.calls[0][0].target.value).toBe("a");
    });

    it("accepts a controlled addition after the user has already selected an option", () => {
        const onSelectionChange = vi.fn();
        const {rerender} = render(multiElement({value: [A], onSelectionChange}));

        openInput();
        pick("Beta");
        expect(selectedLabels()).toEqual(["Alpha", "Beta"]);
        expect(onSelectionChange.mock.calls.at(-1)?.[0].map((item: SelectOptionModel) => item.id)).toEqual(["a", "b"]);

        rerender(multiElement({value: [A, B], onSelectionChange}));
        rerender(multiElement({value: [A, B, C], onSelectionChange}));

        expect(selectedLabels()).toEqual(["Alpha", "Beta", "Charlie"]);
        expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("true");
    });

    it("accepts a controlled removal after the user has already selected an option", () => {
        const {rerender} = render(multiElement({value: [A, B]}));

        openInput();
        pick("Charlie");
        expect(selectedLabels()).toEqual(["Alpha", "Beta", "Charlie"]);

        rerender(multiElement({value: [A, B, C]}));
        rerender(multiElement({value: [A, C]}));

        expect(selectedLabels()).toEqual(["Alpha", "Charlie"]);
    });

    it("updates a controlled option label for the same ID without emitting a selection change", () => {
        const onChange = vi.fn();
        const onSelectionChange = vi.fn();
        const {rerender} = render(multiElement({value: [A], onChange, onSelectionChange}));

        const renamedA = option("a", "Alpha renamed");
        rerender(multiElement({value: [renamedA], onChange, onSelectionChange}));

        expect(selectedLabels()).toEqual(["Alpha renamed"]);
        expect(onChange).not.toHaveBeenCalled();
        expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("keeps a remotely selected option after the search datasource resets", async () => {
        const fetchPage = vi.fn<FetchComboPageFn>(async (_pagination, _page, search) =>
            search.trim() ? [JORDAN] : LOCAL_OPTIONS,
        );
        const remoteUseCombo = createRemoteUseComboCore(fetchPage);
        const remotePagination = pagination(LOCAL_OPTIONS, "/countries");

        render(multiElement({pagination: remotePagination}, remoteUseCombo));

        const input = openInput();
        fireEvent.change(input, {target: {value: "Jordan"}});
        await screen.findByRole("option", {name: "Jordan"});
        pick("Jordan");
        expect(selectedLabels()).toEqual(["Jordan"]);

        fireEvent.change(input, {target: {value: ""}});
        await screen.findByRole("option", {name: "Alpha"});

        expect(selectedLabels()).toEqual(["Jordan"]);
    });

    it("does not lose a remote selection when another option is picked after reset", async () => {
        const onChange = vi.fn();
        const fetchPage = vi.fn<FetchComboPageFn>(async (_pagination, _page, search) =>
            search.trim() ? [JORDAN] : LOCAL_OPTIONS,
        );
        const remoteUseCombo = createRemoteUseComboCore(fetchPage);

        render(multiElement({pagination: pagination(LOCAL_OPTIONS, "/countries"), onChange}, remoteUseCombo));

        const input = openInput();
        fireEvent.change(input, {target: {value: "Jordan"}});
        await screen.findByRole("option", {name: "Jordan"});
        pick("Jordan");

        fireEvent.change(input, {target: {value: ""}});
        await screen.findByRole("option", {name: "Alpha"});
        pick("Alpha");

        expect(emittedIds(onChange).at(-1)).toEqual(["jo", "a"]);
        expect(selectedLabels()).toEqual(["Jordan", "Alpha"]);
    });

    it("uses the latest selection during batched rapid interactions", () => {
        const onChange = vi.fn();
        render(multiElement({initValue: [A], onChange}));

        openInput();
        const beta = screen.getByRole("option", {name: "Beta"});
        const charlie = screen.getByRole("option", {name: "Charlie"});

        act(() => {
            beta.click();
            charlie.click();
        });

        expect(emittedIds(onChange)).toEqual([
            ["a", "b"],
            ["a", "b", "c"],
        ]);
        expect(selectedLabels()).toEqual(["Alpha", "Beta", "Charlie"]);
    });

    it("closes the dropdown on a genuine outside mouse press", async () => {
        render(
            <div>
                {multiElement()}
                <button type="button">Outside</button>
            </div>,
        );

        const input = openInput();
        fireEvent.mouseDown(screen.getByRole("button", {name: "Outside"}));

        await waitFor(() => expect(input.getAttribute("aria-expanded")).toBe("false"));
    });

    it("does not treat mouse or pointer presses inside the option list as outside clicks", () => {
        render(multiElement());

        const input = openInput();
        const alpha = screen.getByRole("option", {name: "Alpha"});

        fireEvent.pointerDown(alpha);
        expect(fireEvent.mouseDown(alpha)).toBe(false);

        expect(input.getAttribute("aria-expanded")).toBe("true");
    });

    it("preserves initValue as uncontrolled-compatible state after user interaction", () => {
        const {rerender} = render(multiElement({initValue: [A]}));

        rerender(multiElement({initValue: [C]}));
        expect(selectedLabels()).toEqual(["Charlie"]);

        openInput();
        pick("Beta");
        expect(selectedLabels()).toEqual(["Charlie", "Beta"]);

        rerender(multiElement({initValue: [A]}));
        expect(selectedLabels()).toEqual(["Charlie", "Beta"]);
    });
});
