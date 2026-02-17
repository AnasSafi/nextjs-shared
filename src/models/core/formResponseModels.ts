import type {FilterModel} from "./dbModels";

export interface FormDataResponseModel<L, D> {
    lookups: L;
    formData: D;
}

export interface OpenFilterModalModel {
    filters?: FilterModel[];
}