import {create} from "zustand";
import type {UserStateModel} from "../models/user/userModels";

export const useUserStore = create<UserStateModel>((set) => ({
    user: null,
    isInitialized: false,
    setUser: (user) => set({ user, isInitialized: true }),
    clearUser: () => set({ user: null, isInitialized: true }),
}));
