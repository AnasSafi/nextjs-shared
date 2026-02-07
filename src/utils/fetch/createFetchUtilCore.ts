import type {FetchOptions} from "../../models/core/fetchModels";
import {FetchError} from "../../extensions/FetchError";
import type {
    FetchCoreConfig,
    HttpMethod,
    RefreshRequestOptions,
    SharedFetchUtil,
} from "./types";
import {ServerErrorModel} from "../../models/core/formModels";

type HeadersMap = Record<string, string>;
type QueryObj = Record<string, unknown>;

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeBaseUrl = (baseUrl: string | undefined): string => {
    if (!baseUrl) return "";
    if (!isAbsoluteUrl(baseUrl)) return "";
    return baseUrl.replace(/\/+$/, "");
};

const buildUrl = (cleanBase: string, path: string): string => {
    if (isAbsoluteUrl(path)) return path;

    const cleanPath = path.replace(/^\/+/, "");
    if (!cleanBase) return `/${cleanPath}`;
    return `${cleanBase}/${cleanPath}`;
};

const toHeadersMap = (h?: HeadersInit): HeadersMap => {
    const out: HeadersMap = {};
    if (!h) return out;

    if (h instanceof Headers) {
        h.forEach((v, k) => (out[k] = v));
        return out;
    }

    if (Array.isArray(h)) {
        for (const [k, v] of h) out[k] = String(v);
        return out;
    }

    const rec = h as Record<string, string>;
    Object.keys(rec).forEach((k) => {
        const v: unknown = rec[k];
        if (v !== undefined && v !== null) out[k] = String(v);
    });

    return out;
};

const normalizeHeaders = (base: HeadersMap, extra?: HeadersMap): Headers => {
    const merged: HeadersMap = {...base, ...(extra ?? {})};
    const out: HeadersMap = {};
    Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null) out[k] = String(v);
    });
    return new Headers(out);
};

const objToSearchParams = (obj: QueryObj): URLSearchParams => {
    const params = new URLSearchParams();

    const append = (prefix: string, value: unknown): void => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach((v, i) => append(`${prefix}[${i}]`, v));
            return;
        }

        if (value instanceof Date) {
            params.append(prefix, value.toISOString());
            return;
        }

        if (typeof value === "object") {
            Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
                append(`${prefix}[${k}]`, v),
            );
            return;
        }

        params.append(prefix, String(value));
    };

    Object.entries(obj).forEach(([k, v]) => append(k, v));
    return params;
};

const applyQuery = (url: string, query: QueryObj, cleanBase: string): string => {
    if (!query || Object.keys(query).length === 0) return url;

    const urlIsAbsolute = isAbsoluteUrl(url);
    const baseForUrl: string = cleanBase || "http://local";

    const u = new URL(url, baseForUrl);
    const extra: URLSearchParams = objToSearchParams(query);
    extra.forEach((v: string, k: string): void => u.searchParams.append(k, v));

    // Keep absolute URLs absolute
    if (urlIsAbsolute || cleanBase) return u.toString();

    // For same-origin relative output
    return `${u.pathname}${u.search}${u.hash}`;
};

const parseOkResponse = async <T>(res: Response): Promise<T> => {
    if (res.status === 204 || res.status === 205) return undefined as unknown as T;

    const ct: string = res.headers.get("content-type") ?? "";
    if (/\bapplication\/json\b/i.test(ct)) return (await res.json()) as T;

    const text: string = await res.text();
    return text as unknown as T;
};

const isServerErrorModel = (x: unknown): x is ServerErrorModel => {
    if (!x || typeof x !== "object") return false;
    const err = (x as Record<string, unknown>)["error"];
    return !!err && typeof err === "object" && "title" in (err as object);
};

const normalizeServerError = async (res: Response): Promise<ServerErrorModel> => {
    try {
        const ct = res.headers.get("content-type") ?? "";
        if (/\bjson\b/i.test(ct)) {
            const data = (await res.json()) as unknown;
            if (isServerErrorModel(data)) return data;

            const rec = data as Record<string, unknown>;
            const err: Record<string, unknown> = (rec["error"] as Record<string, unknown>) || rec;

            const title: string =
                (err?.["title"] as string) ?? (rec["title"] as string) ?? `HTTP ${res.status}`;
            const message: string =
                (err?.["message"] as string) ?? (rec["message"] as string) ?? "";

            const validationErrors = (err?.["validationErrors"] ?? rec["errors"]) as unknown;

            return {error: {title, message, validationErrors}} as ServerErrorModel;
        }

        const text: string = await res.text();
        return {error: {title: `HTTP ${res.status}`, message: text}} as ServerErrorModel;
    } catch {
        return {error: {title: `HTTP ${res.status}`}} as ServerErrorModel;
    }
};

const getSetCookieHeaders = (res: Response): string[] => {
    // Node/Undici sometimes provides a non-standard getSetCookie()
    const anyHeaders = res.headers as unknown as {getSetCookie?: () => string[]};
    if (typeof anyHeaders.getSetCookie === "function") {
        const v = anyHeaders.getSetCookie();
        return Array.isArray(v) ? v.filter(Boolean) : [];
    }

    const single = res.headers.get("set-cookie");
    return single ? [single] : [];
};

const toNetworkErrorModel = (err: unknown): ServerErrorModel => {
    const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Network request failed";
    return {error: {title: "Network Error", message}} as ServerErrorModel;
};

/**
 * Core creator - no runtime checks here.
 * Factories (client/server) are responsible for guarding runtime usage.
 */
export function createFetchUtilCore(config: FetchCoreConfig): SharedFetchUtil {
    const cleanBase: string = normalizeBaseUrl(config.baseUrl);
    const fetchImpl: typeof fetch | undefined = config.fetchImpl ?? globalThis.fetch;

    if (!fetchImpl) {
        throw new Error("No fetch implementation found. Provide fetchImpl in FetchCoreConfig.");
    }

    const authHeaderName = config.auth?.authorizationHeaderName ?? "Authorization";
    const formatAuth = config.auth?.formatAuthorizationValue ?? ((t: string) => t);
    const isAuthError =
        config.auth?.isAuthErrorResponse ?? ((res: Response) => res.status === 401);

    const sendEmptyObject: boolean = !!config.json?.sendEmptyObjectWhenBodyMissing;

    // De-dupe refresh requests per fetchUtil instance
    let refreshInFlight: Promise<string | null> | null = null;

    const getAcceptLanguage = async (override?: string | null): Promise<string | undefined> => {
        if (override && override.length) return override;
        const fromProvider = await config.getLocale?.();
        return fromProvider ? String(fromProvider) : undefined;
    };

    const getExtraHeadersMap = async (): Promise<HeadersMap> => {
        const extra = await config.getExtraHeaders?.();
        return toHeadersMap(extra);
    };

    const maybeCaptureCookies = async (res: Response, url: string, isRefresh: boolean): Promise<void> => {
        const handler = config.cookies?.onSetCookie;
        if (!handler) return;

        const mode = config.cookies?.mode ?? "refresh";
        if (mode === "refresh" && !isRefresh) return;

        const cookies = getSetCookieHeaders(res);
        if (cookies.length === 0) return;

        await handler(cookies, {url, isRefresh, response: res});
    };

    const doFetch = async (url: string, init: RequestInit, isRefresh: boolean): Promise<Response> => {
        await config.hooks?.onRequest?.({url, init, isRefresh});

        const res = await fetchImpl(url, init);

        await config.hooks?.onResponse?.({url, init, isRefresh, response: res});

        // Capture Set-Cookie if configured
        await maybeCaptureCookies(res, url, isRefresh);

        return res;
    };

    const buildInit = async <B>(
        options: FetchOptions<B>,
        args: {
            attachAccessToken: boolean;
            overrideAccessToken?: string | null;
            isRefresh: boolean;
        },
    ): Promise<{url: string; init: RequestInit; method: HttpMethod}> => {
        const {
            path,
            body,
            method = "POST",
            userToken = null,
            acceptLanguage,
            ...init
        } = options;

        const httpMethod: HttpMethod = String(method).toUpperCase() as HttpMethod;
        const bodyAllowed: boolean = httpMethod !== "GET" && httpMethod !== "HEAD";

        const willSendBody: boolean =
            bodyAllowed && (body !== undefined && body !== null ? true : sendEmptyObject);

        const bodyPayload: unknown =
            willSendBody ? (body !== undefined && body !== null ? body : {}) : undefined;

        // Base headers
        const initHeadersMap = toHeadersMap(init.headers);
        const extraHeadersMap = await getExtraHeadersMap();

        const lang = await getAcceptLanguage(acceptLanguage ?? null);

        let token: string | null = null;

        if (args.attachAccessToken) {
            // Prefer explicit userToken if provided
            token = userToken && String(userToken).length ? String(userToken) : null;

            // Otherwise use injected provider
            if (!token && config.auth?.getAccessToken) {
                token = (await config.auth.getAccessToken()) ?? null;
            }

            // Override token if needed (retry after refresh)
            if (args.overrideAccessToken && args.overrideAccessToken.length) {
                token = args.overrideAccessToken;
            }
        }

        const baseHeadersCore: HeadersMap = {
            ...(lang ? {"Accept-Language": lang} : {}),
            ...(token ? {[authHeaderName]: formatAuth(token)} : {}),
        };

        const baseHeadersFinal: HeadersMap = {
            ...baseHeadersCore,
            ...(willSendBody ? {"Content-Type": "application/json"} : {}),
            ...initHeadersMap,
            ...extraHeadersMap, // extra headers should be overridable by initHeadersMap? depends.
        };

        // If consumer wants init.headers to override extra headers, reorder.
        // We keep extra headers last only if you want them to win. If you want init to win, move extraHeadersMap before initHeadersMap.

        // URL build
        let url: string = buildUrl(cleanBase, String(path));

        // GET/HEAD body becomes query parameters
        if (!bodyAllowed && body && typeof body === "object") {
            url = applyQuery(url, body as unknown as QueryObj, cleanBase);
        }

        const mergedInit: RequestInit = {
            ...config.defaultInit,
            ...init,
            method: httpMethod,
            headers: normalizeHeaders(baseHeadersFinal),
            ...(willSendBody ? {body: JSON.stringify(bodyPayload)} : {}),
        };

        return {url, init: mergedInit, method: httpMethod};
    };

    const refreshTokenOnce = async (): Promise<string | null> => {
        const refreshAccessToken = config.auth?.refreshAccessToken;
        if (!refreshAccessToken) return null;

        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
            try {
                const ctxRequest = async <B>(opts: RefreshRequestOptions<B>): Promise<Response> => {
                    const fo: FetchOptions<B> = {
                        path: opts.path,
                        method: opts.method ?? "POST",
                        body: opts.body as B,
                        acceptLanguage: opts.acceptLanguage ?? undefined,
                        headers: opts.headers,
                        // keep default init but allow overrides
                        ...(opts as Omit<RefreshRequestOptions<B>, "path" | "method" | "body" | "headers" | "acceptLanguage">),
                    } as unknown as FetchOptions<B>;

                    const built = await buildInit(fo, {
                        attachAccessToken: false,
                        isRefresh: true,
                    });

                    try {
                        return await doFetch(built.url, built.init, true);
                    } catch (e) {
                        // Return a thrown error upward; caller will treat as null
                        throw e;
                    }
                };

                const token = await refreshAccessToken({request: ctxRequest});
                return token && token.length ? token : null;
            } catch {
                return null;
            } finally {
                refreshInFlight = null;
            }
        })();

        return refreshInFlight;
    };

    const fetchUtil: SharedFetchUtil = async <T, B = unknown>(options: FetchOptions<B>): Promise<T> => {
        let response: Response;

        // 1) First request
        try {
            const built = await buildInit(options, {
                attachAccessToken: true,
                isRefresh: false,
            });
            response = await doFetch(built.url, built.init, false);
        } catch (err) {
            const serverError = toNetworkErrorModel(err);
            throw new FetchError("serverRespondedWithAnError", serverError);
        }

        // 2) Auth flow
        if (isAuthError(response)) {
            const newToken = await refreshTokenOnce();

            if (newToken) {
                try {
                    const builtRetry = await buildInit(options, {
                        attachAccessToken: true,
                        overrideAccessToken: newToken,
                        isRefresh: false,
                    });
                    const retryRes = await doFetch(builtRetry.url, builtRetry.init, false);

                    if (retryRes.ok) {
                        return await parseOkResponse<T>(retryRes);
                    }

                    // If retry failed, this is the response to report
                    response = retryRes;
                } catch (err) {
                    const serverError = toNetworkErrorModel(err);
                    throw new FetchError("serverRespondedWithAnError", serverError);
                }
            }

            // 3) Auth failed (no refresh or refresh failed or retry failed)
            const serverError: ServerErrorModel = await normalizeServerError(response);

            await config.auth?.onAuthFailure?.({
                response,
                serverError,
            });

            throw new FetchError("authenticationFailed", serverError);
        }

        // 4) Non-OK errors
        if (!response.ok) {
            const serverError: ServerErrorModel = await normalizeServerError(response);
            throw new FetchError("serverRespondedWithAnError", serverError);
        }

        // 5) Success
        return await parseOkResponse<T>(response);
    };

    return fetchUtil;
}
