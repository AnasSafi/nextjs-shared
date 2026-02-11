import React, {Dispatch, SetStateAction} from "react";

export interface ReplaceOptions {
    flash?: (id: string | number, flashes?: number, interval?: number) => void;
    flashes?: number;
    interval?: number;
}

/* Row key */
type Keyed = { id: string | number } | { rowId: string | number };
const getKey = (r: Keyed): string | number =>
    "id" in r ? r.id : r.rowId;

/* — addRow: does not require key condition — */
export const addRow = <T extends Keyed>(
    setData: React.Dispatch<React.SetStateAction<T[]>>,
    newRow: T,
    options?: ReplaceOptions
): void => {
    setData((prev: T[]): T[] => [newRow, ...prev]);
    if (options?.flash) {
        const id = getKey(newRow);
        options.flash(id, options.flashes, options.interval);
    }
};

/* — deleteRow & replaceRow require key — */
export const deleteRow = <T extends Keyed>(
    setData: React.Dispatch<React.SetStateAction<T[]>>,
    key: string | number
): void =>
    setData((prev: T[]): T[] =>
        prev.filter((r: T): boolean => getKey(r) !== key)
    );

export const replaceRow = <T extends Keyed>(
    setData: Dispatch<SetStateAction<T[]>>,
    oldKey: string | number,
    newRow: T,
    options?: ReplaceOptions
): void => {
    setData((prev) => {
        const i = prev.findIndex((r) => getKey(r) === oldKey);
        if (i === -1) return prev;
        const next = [...prev];
        next[i] = newRow;
        return next;
    });

    if (options?.flash) {
        options.flash(oldKey, options.flashes, options.interval);
    }
};
