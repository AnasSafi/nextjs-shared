import {ConsoleUtils} from "./consoleUtils";

export type JoseVerifyResult = {payload: unknown};

export type JoseLike = {
    jwtVerify: (
        token: string,
        secret: Uint8Array,
        opts?: {issuer?: string; audience?: string},
    ) => Promise<JoseVerifyResult>;
};

export type JwtConfig = {
    issuer: string;
    audience: string;
    secret: string;
};

export type JwtPayloadLike = Record<string, unknown>;

export function createJWTUtils<TPayload extends JwtPayloadLike>(args: {
    jose: JoseLike;
    config: JwtConfig;
}) {
    const {jose, config} = args;

    const encodeSecret = (): Uint8Array => new TextEncoder().encode(config.secret);

    return class JWTUtils {
        static async isValid(token: string): Promise<boolean> {
            if (!config.secret) throw new Error("JWT secret is missing.");
            if (!config.issuer) throw new Error("JWT issuer is missing.");
            if (!config.audience) throw new Error("JWT audience is missing.");

            const secret = encodeSecret();

            try {
                await jose.jwtVerify(token, secret, {
                    issuer: config.issuer,
                    audience: config.audience,
                });
                return true;
            } catch (error) {
                const jwtError = error as {code?: string};

                if (jwtError.code === "ERR_JWT_EXPIRED") {
                    // silent
                } else if (jwtError.code === "ERR_JWT_MALFORMED") {
                    ConsoleUtils.error("The JWT is malformed.");
                } else if (jwtError.code === "ERR_JWT_INVALID") {
                    ConsoleUtils.error("The token is invalid.");
                } else if (jwtError.code === "ERR_JWT_SIGNATURE_INVALID") {
                    ConsoleUtils.error("The signature of the token is invalid.");
                } else {
                    ConsoleUtils.error(error);
                }

                return false;
            }
        }

        static async getPayload(token: string): Promise<TPayload | null> {
            if (!config.secret) throw new Error("JWT secret is missing.");

            const secret = encodeSecret();

            try {
                const {payload} = await jose.jwtVerify(token, secret, {
                    issuer: config.issuer,
                    audience: config.audience,
                });

                return payload as TPayload;
            } catch {
                return null;
            }
        }

        static async getFieldFromPayload<K extends keyof TPayload>(
            token: string,
            field: K,
        ): Promise<TPayload[K] | null> {
            const payload = await this.getPayload(token);
            return payload ? (payload[field] as TPayload[K]) : null;
        }
    };
}