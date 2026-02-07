"use client";

export type AuthCookieNames = {
    accessTokenCookieName: string;
    refreshTokenCookieName?: string;
};

const readCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
};

export function createUserTokenServices(names: AuthCookieNames): {
    getUserToken: () => Promise<string | null>;
    getRefreshToken: () => Promise<string | null>;
    clearAuthTokens: () => Promise<void>;
} {
    const getUserToken = async (): Promise<string | null> =>
        readCookie(names.accessTokenCookieName);

    const getRefreshToken = async (): Promise<string | null> => null;

    const clearAuthTokens = async (): Promise<void> => {
        if (typeof document !== "undefined") {
            document.cookie = `${names.accessTokenCookieName}=; Max-Age=0; Path=/`;
            if (names.refreshTokenCookieName) {
                document.cookie = `${names.refreshTokenCookieName}=; Max-Age=0; Path=/`;
            }
        }
    };

    return {
        getUserToken,
        getRefreshToken,
        clearAuthTokens,
    };
}
