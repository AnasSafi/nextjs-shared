// src/utils/fetch/createServerFetchUtil.ts

import type {ServerFetchFactoryConfig, SharedFetchUtil} from "./types";
import {createFetchUtilCore} from "./createFetchUtilCore";

/**
 * Server factory - runtime guarded.
 * Uses server-friendly defaults (Next caching off).
 */
export function createServerFetchUtil(config: ServerFetchFactoryConfig): SharedFetchUtil {
    if (typeof window !== "undefined") {
        throw new Error(
            "createServerFetchUtil() was called on the client. Use createClientFetchUtil() for browser runtime.",
        );
    }

    return createFetchUtilCore({
        ...config,
        defaultInit: {
            cache: "no-store",
            ...config.defaultInit,
        },
    });
}
