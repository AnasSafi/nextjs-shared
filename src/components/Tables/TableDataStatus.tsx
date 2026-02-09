"use client";

import React, {JSX} from "react";
import CircleLoader from "../Loader/CircleLoader";

export type TableDataStatusProps = {
    inProgress: boolean;
    hasMoreData: boolean;
    dataLength: number;
    noDataText: string;
    loaderSizePx?: number;
};

export default function TableDataStatus(
    {
        inProgress,
        hasMoreData,
        dataLength,
        noDataText,
        loaderSizePx = 12,
    }: TableDataStatusProps
): JSX.Element {
    const noData: boolean = dataLength === 0;

    return (
        <>
            {inProgress && (
                <div className="text-center m-1">
                    <CircleLoader sizePx={loaderSizePx}/>
                </div>
            )}

            {!hasMoreData && noData && !inProgress && (
                <div
                    className="text-center text-gray-600 dark:text-gray-300 whitespace-pre-line my-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl"
                >
                    {noDataText}
                </div>
            )}
        </>
    );
}
