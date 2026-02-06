export type HeaderLike = {
    get(name: string): string | null | undefined;
};

/**
 * Ensure a path is prefixed with locale code or replace existing locale prefix.
 * This is a pure function; caller must provide interfaceLanguages.
 */
export function pathBaseWithInterfaceLanguages(path: string, localeCode: string, interfaceLanguages: string[]): string {
    let out = path;

    if (out.startsWith("/")) {
        if (!interfaceLanguages.some((loc) => out.startsWith(`/${loc}`))) {
            out = `/${localeCode}${out}`;
        } else {
            for (const loc of interfaceLanguages) {
                if (out.startsWith(`/${loc}`)) {
                    out = out.replace(`/${loc}`, `/${localeCode}`);
                    break;
                }
            }
        }
    }

    return out;
}

export function pathBaseWithoutQueryParametersWithInterfaceLanguages(
    path: string,
    localeCode: string,
    interfaceLanguages: string[]
): string {
    const basePath = path.split("?")[0];
    return pathBaseWithInterfaceLanguages(basePath, localeCode, interfaceLanguages);
}

export function isUrlStartWith(params: { urlToCheck: string; route: string; interfaceLanguages: string[] }): boolean {
    const {urlToCheck, route, interfaceLanguages} = params;
    return interfaceLanguages.some((loc) => urlToCheck.startsWith(`/${loc}/${route}`));
}

/**
 * Safely join baseUrl and path, avoiding double slashes.
 * If path is absolute (http/https), returns it unchanged.
 */
export function buildUrl(baseUrl: string, path: string): string {
    const cleanBase = baseUrl.trim();
    const cleanPath = path.trim();

    if (/^https?:\/\//i.test(cleanPath)) {
        return cleanPath;
    }

    const base = cleanBase.replace(/\/+$/, "");
    const subPath = cleanPath.replace(/^\/+/, "");

    if (!base) {
        return `/${subPath}`;
    }

    return `${base}/${subPath}`;
}

/**
 * Derive absolute origin from env or optional request headers.
 * This function does not depend on project constants.
 */
export function resolveAbsoluteOrigin(opts?: { headers?: HeaderLike }): string {
    const envBase = (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env?.NEXT_PUBLIC_SITE_URL?.trim();
    if (envBase && /^https?:\/\//i.test(envBase)) {
        return envBase.replace(/\/+$/, "");
    }

    const h = opts?.headers;
    const proto = h?.get?.("x-forwarded-proto") ?? undefined;
    const host = h?.get?.("x-forwarded-host") ?? h?.get?.("host") ?? undefined;

    if (host) {
        return `${proto ?? "https"}://${host}`.replace(/\/+$/, "");
    }

    return "http://localhost:3000";
}

/**
 * Build an absolute URL using resolveAbsoluteOrigin() + buildUrl().
 * Optionally localize the path using interfaceLanguages.
 */
export function buildAbsoluteUrl(
    path: string,
    opts?: { localeCode?: string; headers?: HeaderLike; interfaceLanguages?: string[] }
): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;

    const localized =
        opts?.localeCode && opts?.interfaceLanguages
            ? pathBaseWithInterfaceLanguages(normalized, opts.localeCode, opts.interfaceLanguages)
            : normalized;

    const origin = resolveAbsoluteOrigin({ headers: opts?.headers });
    return buildUrl(origin, localized);
}
