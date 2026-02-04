let cachedLocale: string | null = null;

export function getAppLocaleSingleton(defaultLng: string): string {
    if (!cachedLocale) cachedLocale = defaultLng;
    return cachedLocale;
}

export function setAppLocaleSingleton(newLocale: string): void {
    cachedLocale = newLocale;
}