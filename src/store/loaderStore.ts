import {create} from "zustand";
import {LoaderStateModel} from "../models/ui/modalModels";

export const useLoaderStore = create<LoaderStateModel>((set) => ({
    isLoading: false,
    setLoading: (value: boolean) => set(() => ({isLoading: value})),
}));

