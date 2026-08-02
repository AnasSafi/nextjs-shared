import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import TableRowActions from "../src/components/Tables/TableRowActions";
import {ButtonVariant, type RowAction} from "../src/models/ui/tableModels";

vi.mock("next/link", () => ({
    default: ({href, children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {href: string}) => (
        <a href={href} {...props}>{children}</a>
    ),
}));

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

type Row = {
    id: number;
    actions?: RowAction<Row>[];
};

const t = (key: string): string => key;

describe("TableRowActions", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
        vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
            callback(0);
            return 1;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("returns null when there are no merged actions", () => {
        const {container} = render(<TableRowActions row={{id: 1}} t={t} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders one action compactly in table mode", () => {
        render(
            <TableRowActions
                displayMode="table"
                row={{id: 1, actions: [{type: "serverButton", key: "edit", label: "Edit"}]}}
                t={t}
            />,
        );

        expect(screen.getByRole("button", {name: "Edit"})).toBeTruthy();
        expect(screen.getByRole("button", {name: "Edit"}).className).not.toContain("mt-1");
    });

    it("uses the dropdown for more than one action in table mode", async () => {
        render(
            <TableRowActions
                displayMode="table"
                row={{
                    id: 1,
                    actions: [
                        {type: "serverButton", key: "edit", label: "Edit"},
                        {type: "serverButton", key: "delete", label: "Delete"},
                    ],
                }}
                t={t}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: "actions"}));
        expect(await screen.findByRole("menu")).toBeTruthy();
    });

    it("keeps one or two actions inline in card mode", () => {
        render(
            <TableRowActions
                displayMode="card"
                row={{
                    id: 1,
                    actions: [
                        {type: "serverButton", key: "edit", label: "Edit"},
                        {type: "serverLink", key: "view", label: "View", href: "/view"},
                    ],
                }}
                t={t}
            />,
        );

        expect(screen.queryByRole("button", {name: "actions"})).toBeNull();
        expect(screen.getByRole("button", {name: "Edit"})).toBeTruthy();
        expect(screen.getByRole("link", {name: "View"})).toBeTruthy();
    });

    it("uses the dropdown for more than two actions in card mode", async () => {
        render(
            <TableRowActions
                displayMode="card"
                row={{
                    id: 1,
                    actions: [
                        {type: "serverButton", key: "a", label: "A"},
                        {type: "serverButton", key: "b", label: "B"},
                        {type: "serverButton", key: "c", label: "C"},
                    ],
                }}
                t={t}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: "actions"}));
        expect(await screen.findByRole("menu")).toBeTruthy();
    });

    it("merges client overrides with server actions", () => {
        render(
            <TableRowActions
                displayMode="table"
                row={{id: 1, actions: [{type: "serverButton", key: "edit", label: "Server"}]}}
                clientRowActions={[
                    {
                        type: "clientButton",
                        key: "edit",
                        label: "Client",
                        variant: ButtonVariant.Danger,
                        onClick: vi.fn(),
                    },
                ]}
                t={t}
            />,
        );

        expect(screen.getByRole("button", {name: "Client"}).className).toContain("bg-red-600");
    });

    it("executes async handlers", async () => {
        const onClick = vi.fn(async () => undefined);
        render(
            <TableRowActions
                displayMode="table"
                row={{id: 1, actions: [{type: "clientButton", key: "edit", label: "Edit", onClick}]}}
                t={t}
            />,
        );

        fireEvent.click(screen.getByRole("button", {name: "Edit"}));
        await waitFor(() => expect(onClick).toHaveBeenCalledWith({id: 1, actions: expect.any(Array)}));
    });
});
