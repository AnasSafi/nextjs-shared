// src/utils/fetch/createClientFetchUtil.ts

import type {ClientFetchFactoryConfig, SharedFetchUtil} from "./types";
import {createFetchUtilCore} from "./createFetchUtilCore";

/**
 * Client factory - runtime guarded.
 * Uses browser-friendly defaults.
 */
export function createClientFetchUtil(config: ClientFetchFactoryConfig): SharedFetchUtil {
    if (typeof window === "undefined") {
        throw new Error(
            "createClientFetchUtil() was called on the server. Use createServerFetchUtil() for server runtime.",
        );
    }

    return createFetchUtilCore({
        ...config,
        defaultInit: {
            cache: "no-store",
            credentials: "include",
            ...config.defaultInit,
        },
    });
}
