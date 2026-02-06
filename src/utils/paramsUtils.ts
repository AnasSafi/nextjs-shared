/**
 * Converts a string to a best-guess primitive or structured value.
 * Supports: boolean, null, number, JSON, string.
 */
export function cast(value: string): unknown {
    const trimmed: string = value.trim();
    const lower: string = trimmed.toLowerCase();

    if (lower === "true") return true as boolean;
    if (lower === "false") return false as boolean;
    if (lower === "null") return null;

    const num: number = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(num)) return num;

    if (/^[\[{]/.test(trimmed)) {
        try {
            return JSON.parse(trimmed) as unknown;
        } catch {
            /* fallthrough */
        }
    }

    return value as string;
}

/**
 * Assigns a value allowing repeated leaf keys to aggregate as an array.
 */
function assignValue(target: Record<string | number, unknown>, key: string | number, value: unknown): void {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
        const prev = target[key];
        if (Array.isArray(prev)) {
            prev.push(value);
        } else {
            target[key] = [prev, value];
        }
    } else {
        target[key] = value;
    }
}

/**
 * Converts URLSearchParams into a nested object supporting:
 *  - Dots: user.address.city
 *  - Brackets: user[address][city], filters[0][field]
 * Repeated final keys are aggregated as arrays.
 */
export function parseSearchParamsToObject<T = Record<string, unknown>>(searchParams: URLSearchParams): T {
    const result: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of searchParams.entries()) {
        const parts: string[] = rawKey.split(/[.[\]]/).filter(Boolean);

        let cursor: Record<string, unknown> = result;

        parts.forEach((part: string, idx: number): void => {
            const isLast: boolean = idx === parts.length - 1;
            const isNumeric: boolean = /^\d+$/.test(part);
            const key: string | number = isNumeric ? Number(part) : part;

            if (isLast) {
                assignValue(cursor, key, cast(rawValue));
                return;
            }

            const nextIsNumeric: boolean = /^\d+$/.test(parts[idx + 1]);

            if (cursor[key] === undefined) {
                cursor[key] = nextIsNumeric ? [] : {};
            } else {
                if (nextIsNumeric && !Array.isArray(cursor[key])) {
                    cursor[key] = [];
                }
                if (!nextIsNumeric && Array.isArray(cursor[key])) {
                    cursor[key] = {};
                }
            }

            if (nextIsNumeric && Array.isArray(cursor[key])) {
                const nextIndex: number = Number(parts[idx + 1]);
                if (cursor[key].length <= nextIndex) {
                    cursor[key].length = nextIndex + 1;
                }
            }

            const next = cursor[key];
            if (typeof next === "object" && next !== null) {
                cursor = next as Record<string, unknown>;
            }
        });
    }

    return result as T;
}
