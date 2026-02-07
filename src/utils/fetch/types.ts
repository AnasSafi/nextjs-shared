import type {FetchOptions} from "../../models/core/fetchModels";
import {ServerErrorModel} from "../../models/core/formModels";

/** Utility type for sync/async providers */
export type MaybePromise<T> = T | Promise<T>;

/** Public fetch util signature (same as consumers already use) */
export type SharedFetchUtil = <T, B = unknown>(options: FetchOptions<B>) => Promise<T>;

/** Default HTTP methods we normalize to uppercase */
export type HttpMethod =
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "HEAD"
    | "OPTIONS";

/** Extra Set-Cookie capture context */
export interface SetCookieContext {
    url: string;
    isRefresh: boolean;
    response: Response;
}

/** Optional hooks - must not consume response body */
export interface FetchCoreHooks {
    onRequest?: (ctx: {url: string; init: RequestInit; isRefresh: boolean}) => MaybePromise<void>;
    onResponse?: (ctx: {
        url: string;
        init: RequestInit;
        isRefresh: boolean;
        response: Response;
    }) => MaybePromise<void>;
}

export interface CookieCaptureConfig {
    /**
     * - "refresh": only capture Set-Cookie headers from refresh requests
     * - "all": capture Set-Cookie headers from every request
     */
    mode?: "refresh" | "all";
    onSetCookie?: (cookies: string[], ctx: SetCookieContext) => MaybePromise<void>;
}

export interface JsonBehaviorConfig {
    /**
     * If true and method allows a body, send {} when body is missing.
     * Useful for backends requiring a JSON body even when payload is empty.
     */
    sendEmptyObjectWhenBodyMissing?: boolean;
}

/**
 * Minimal request options for refresh (no access-token auto injection)
 */
export type RefreshRequestOptions<B = unknown> =
    Omit<RequestInit, "method" | "headers" | "body"> & {
    path: string;
    method?: HttpMethod | string;
    headers?: HeadersInit;
    body?: B;
    acceptLanguage?: string | null;
};

export interface RefreshAccessTokenContext {
    /**
     * Performs a request using same baseUrl/defaultInit/extraHeaders logic,
     * but WITHOUT attaching current access token and WITHOUT auth retry.
     */
    request: <B = unknown>(options: RefreshRequestOptions<B>) => Promise<Response>;
}

export interface AuthFailureContext {
    response: Response;
    serverError: ServerErrorModel;
}

export interface AuthConfig {
    /** Provide current access token (or null) */
    getAccessToken?: () => MaybePromise<string | null>;

    /**
     * Refresh access token when auth error happens (default: 401).
     * Return new access token, or null if refresh fails.
     */
    refreshAccessToken?: (ctx: RefreshAccessTokenContext) => MaybePromise<string | null>;

    /**
     * Called when refresh fails OR retry still fails with auth error.
     * Consumers clear tokens, sign out, broadcast logout, etc.
     */
    onAuthFailure?: (ctx: AuthFailureContext) => MaybePromise<void>;

    /** Override auth error detection (default: status === 401) */
    isAuthErrorResponse?: (res: Response) => boolean;

    /** Authorization header name (default: "Authorization") */
    authorizationHeaderName?: string;

    /**
     * Format how Authorization header value is written.
     * Default: token as-is (no automatic "Bearer " prefix).
     */
    formatAuthorizationValue?: (token: string) => string;
}

export interface FetchCoreConfig {
    /** Absolute base URL or empty to use same-origin */
    baseUrl?: string;

    /** Fetch implementation (defaults to globalThis.fetch) */
    fetchImpl?: typeof fetch;

    /** Default RequestInit merged into each request */
    defaultInit?: RequestInit;

    /** Extra headers injected into every request (e.g., cookie forwarding on server) */
    getExtraHeaders?: () => MaybePromise<HeadersInit | undefined>;

    /** Default locale provider for Accept-Language */
    getLocale?: () => MaybePromise<string | null | undefined>;

    /** Auth injection */
    auth?: AuthConfig;

    /** JSON/body behavior */
    json?: JsonBehaviorConfig;

    /** Optional hooks */
    hooks?: FetchCoreHooks;

    /** Optional Set-Cookie capture */
    cookies?: CookieCaptureConfig;
}

/** Factory configs (same shape, but runtime-guarded by factories) */
export interface ClientFetchFactoryConfig extends FetchCoreConfig {
    runtime?: "client";
}

export interface ServerFetchFactoryConfig extends FetchCoreConfig {
    runtime?: "server";
}
