export interface FetchOptions<B = unknown> {
    method?: string;
    headers?: HeadersInit;
    path: string;
    body?: B;
    userToken?: string | null;
    refreshToken?: string | null;
    acceptLanguage?: string;
    iso3Locale?: string;
    signal?: AbortSignal;
}

export interface HttpHeaders {
    "Content-Type"?: string;
    "Accept-Language"?: string;
    "Authorization"?: string;
    "language"?: string;
    [key: string]: string | undefined;
}
