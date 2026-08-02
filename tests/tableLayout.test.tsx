import React, {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {CardView} from "../src/components/Tables/CardView";
import {TablePagesCore} from "../src/components/Tables/TablePagesCore";
import {TableView} from "../src/components/Tables/TableView";
import type {Column, RowMeta} from "../src/models/ui/tableModels";
import type {PaginationRequestModel} from "../src/models/core/dbModels";

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

type Row = RowMeta<number, Row> & {
    name: string;
    count: number;
    createdAt: string;
};

const t = (key: string): string => key;

const rows: Row[] = [
    {
        id: 1,
        name: "https://example.com/a/very/long/unbroken/url/that/should/wrap",
        count: 1234,
        createdAt: "2026-08-02T10:00:00.000Z",
        actions: [{type: "serverButton", key: "edit", label: "Edit"}],
    },
];

const columns: Column<Row>[] = [
    {
        title: "Name",
        field: "name",
        layout: {width: 240, maxWidth: "20rem", wrap: "wrap"},
        headerClassName: "custom-header",
        cellClassName: "custom-cell",
        cell: {kind: "multiLang", className: "cell-config-class"},
    },
    {title: "Count", field: "count", cell: {kind: "number"}},
    {title: "Created", field: "createdAt", cell: {kind: "dateTime"}},
];

describe("table layout containment", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("does not apply nowrap to every TableView cell", () => {
        render(
            <TableView
                data={rows}
                columns={columns}
                showRowsActions={false}
                currentLng="en"
                t={t}
            />,
        );

        const firstCell = screen.getByText(rows[0].name).closest("td");
        expect(firstCell?.className).not.toContain("whitespace-nowrap");
        expect(firstCell?.className).toContain("[overflow-wrap:anywhere]");
    });

    it("renders a single scroll region around the table", () => {
        const {container} = render(
            <TableView
                data={rows}
                columns={columns}
                showRowsActions={false}
                currentLng="en"
                t={t}
            />,
        );

        const scrollElement = container.querySelector("[data-table-scroll-area='true']");
        const scrollWrapper = scrollElement?.parentElement;

        expect(container.querySelectorAll("[data-table-scroll-area='true']").length).toBe(1);
        expect(scrollWrapper?.className).toContain("relative");
        expect(scrollWrapper?.className).toContain("isolate");
        expect(scrollWrapper?.className).toContain("z-0");
        expect(scrollElement?.className).toContain("overflow-x-auto");
        expect(container.querySelector("table")?.className).toContain("w-max");
    });

    it("uses local sticky logical-end layers for the action column", () => {
        const {container} = render(
            <TableView
                data={rows}
                columns={columns}
                showRowsActions={true}
                currentLng="en"
                t={t}
            />,
        );

        const stickyHeader = container.querySelector("th.sticky");
        const stickyCell = container.querySelector("td.sticky");
        expect(stickyHeader?.className).toContain("end-0");
        expect(stickyHeader?.className).toContain("z-[3]");
        expect(stickyHeader?.className).toContain("bg-white");
        expect(stickyHeader?.className).toContain("dark:bg-gray-900");
        expect(stickyCell?.className).toContain("end-0");
        expect(stickyCell?.className).toContain("z-[2]");
        expect(stickyCell?.className).toContain("bg-inherit");
    });

    it("applies column layout metadata and keeps plain columns valid", () => {
        const {container} = render(
            <TableView
                data={rows}
                columns={columns}
                showRowsActions={false}
                currentLng="en"
                t={t}
            />,
        );

        const firstHeader = container.querySelector("th");
        const firstCell = container.querySelector("td");
        expect(firstHeader?.style.width).toBe("240px");
        expect(firstHeader?.style.maxWidth).toBe("20rem");
        expect(firstHeader?.className).toContain("custom-header");
        expect(firstCell?.style.width).toBe("240px");
        expect(firstCell?.className).toContain("custom-cell");
        expect(firstCell?.className).toContain("cell-config-class");
        expect(container.querySelectorAll("th").length).toBeGreaterThan(1);
    });

    it("uses viewport visibility classes for card and table views", () => {
        const card = render(
            <CardView
                data={rows}
                columns={columns}
                showRowsActions={false}
                currentLng="en"
                t={t}
            />,
        );
        const cardClassName = card.container.firstElementChild?.className ?? "";
        expect(cardClassName).toContain("min-[1024px]:hidden");
        expect(cardClassName).not.toContain("@min-[48rem]/table-page:hidden");
        card.unmount();

        const table = render(
            <TableView
                data={rows}
                columns={columns}
                showRowsActions={false}
                currentLng="en"
                t={t}
            />,
        );
        const tableClassName = table.container.firstElementChild?.className ?? "";
        expect(tableClassName).toContain("min-[1024px]:block");
        expect(tableClassName).not.toContain("@min-[48rem]/table-page:block");
    });

    it("contains the TablePagesCore root width", async () => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);

        const emptyPagination: PaginationRequestModel = {
            getMorePath: "/api",
            page: 1,
            pageSize: 20,
            totalCount: 0,
            sorts: [],
            sortableFields: [],
            filters: [],
        };

        function Harness() {
            const [data, setData] = useState<Row[]>([]);

            return (
                <TablePagesCore
                    data={data}
                    setData={setData}
                    apiPath="/api"
                    columns={columns}
                    title="Users"
                    clientRowActions={[]}
                    t={t}
                    currentLng="en"
                    fetchUtil={async () => ({
                        success: {
                            data: {
                                description: [],
                                pagination: emptyPagination,
                                tableRows: [],
                            },
                        },
                    })}
                    themeColor="blue"
                    buttonClassNames={{primary: "bg-blue-600 text-white"}}
                    tableApiMethod="POST"
                    TableFiltersComponent={() => <div />}
                />
            );
        }

        const {container} = render(<Harness />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain("w-full");
        expect(root.className).toContain("min-w-0");
        expect(root.className).toContain("max-w-full");
        expect(root.className).toContain("@container/table-page");

        await waitFor(() => expect(screen.getByText("Users")).toBeTruthy());
    });
});
