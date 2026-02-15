import React, { useCallback } from "react";
import {PaginationRequestModel} from "../../models/core/dbModels";

export function useDoAction(
    setPagination: React.Dispatch<React.SetStateAction<PaginationRequestModel>>,
    setRefreshKey: React.Dispatch<React.SetStateAction<number>>,
    pagination: PaginationRequestModel
) {
    return useCallback(
        (actionKey: "refresh"): void => {
            if (actionKey === "refresh") {
                if (pagination.page === 1) {
                    setRefreshKey((prev: number) => prev + 1);
                } else {
                    setPagination((p: PaginationRequestModel) => ({ ...p, page: 1 }));
                }
            }
        },
        [pagination, setPagination, setRefreshKey]
    );
}
