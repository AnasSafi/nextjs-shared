import type {JoseLike} from "../jwtUtils";

export type GetJwtSecret = () => string | undefined;

export function createDecodeJwtUserId(args: {
    jose: Pick<JoseLike, "jwtVerify">;
    getJwtSecret: GetJwtSecret;
}) {
    const {jose, getJwtSecret} = args;

    return async function decodeJwtUserId(token: string): Promise<string | null> {
        if (!token) return null;

        const secret = getJwtSecret();
        if (!secret) return null;

        try {
            const encoder = new TextEncoder();
            const {payload} = await jose.jwtVerify(token, encoder.encode(secret));

            const rec = payload as unknown as Record<string, unknown>;
            const userId = rec["userId"];
            return typeof userId === "string" ? userId : null;
        } catch {
            return null;
        }
    };
}