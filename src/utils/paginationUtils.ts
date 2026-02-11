import type {PaginationRequestModel} from "../models/core/dbModels";

export const preparePagination = (
    pagination?: PaginationRequestModel
): { page: number; skip: number; take: number } => {
    const page: number = pagination?.page ?? 1;
    const take: number = pagination?.pageSize ?? 20;
    const skip: number = (page - 1) * take;

    return {page, skip, take};
};
