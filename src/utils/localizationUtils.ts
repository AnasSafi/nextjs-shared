export function isLocaleObject(obj: unknown): obj is Record<string, string> {
    return (
        !!obj &&
        typeof obj === "object" &&
        !Array.isArray(obj) &&
        Object.values(obj).every((val: unknown): boolean => typeof val === "string")
    );
}
