"use client";

import {useUserStore} from "@/store/userStore";

export function usePermission(requiredPerms: string[] = []): { loading: boolean; allowed: boolean } {
    const {user, isInitialized} = useUserStore();

    const allowed: boolean = isInitialized
        ? (requiredPerms.length === 0
            ? true
            : (user?.hasOneOfPermissions?.(requiredPerms) ?? false))
        : false;

    return {
        loading: !isInitialized,
        allowed,
    };
}
