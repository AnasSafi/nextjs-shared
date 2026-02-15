import {useCallback, useEffect, useRef} from "react";
import type {RefObject} from "react";
import type {CardViewHandle} from "../../components/Tables/CardView";
import type {TableViewHandle} from "../../components/Tables/TableView";

export function useFlashById<R extends { id: string | number }>(
    data: R[],
    tableRef: RefObject<TableViewHandle | null>,
    cardRef: RefObject<CardViewHandle | null>,
): (id: string | number, flashes?: number, interval?: number) => void {
    const pendingFlashRef: RefObject<{
        id: string | number
        flashes: number
        interval: number
    } | null> = useRef<{
        id: string | number;
        flashes: number;
        interval: number;
    } | null>(null);

    useEffect((): void => {
        if (!pendingFlashRef.current) return;
        const {id, flashes, interval} = pendingFlashRef.current;
        const idx: number = data.findIndex((r: R) => r.id === id);
        if (idx >= 0) {
            tableRef.current?.flashRow(idx, flashes, interval);
            cardRef.current?.flashCard(idx, flashes, interval);
            pendingFlashRef.current = null; // reset
        }
    }, [data, tableRef, cardRef]);

    return useCallback(
        (
            id: string | number,
            flashes = 3,
            interval = 300
        ): void => {
            pendingFlashRef.current = {id, flashes, interval};
        },[]
    );

}
