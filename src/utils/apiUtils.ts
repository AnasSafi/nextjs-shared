import type {NextRequest} from "next/server";
import {ConsoleUtils} from "./consoleUtils";
import type {TranslateFn} from "../models/core/localeModels";
import {UserModel} from "../models/user/userModels";
import {errorResponse} from "../models/core/formModels";
import {PermissionModel} from "../models/core/authenticationModels";

/* ----------------------------- Shared types ------------------------------ */

type BodyType = "json" | "form" | "text" | undefined;

type InferBody<BType extends BodyType, J = unknown> =
    BType extends "json" ? J :
        BType extends "form" ? FormData :
            BType extends "text" ? string :
                undefined;

export type RouteConfigLike = {
    apiUrl?: string;
    canPassMaintenanceMode?: boolean;
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    requiredPermission?: string[];
    bodyType?: BodyType;
};

/**
 * Allow consumer ServerResponse classes with extended constructor signatures,
 * e.g. new (body, status?, extraHeaders?) => ServerResponse<T>.
 */
export type ServerResponseCtor<TServerResponse> = new (...args: any[]) => TServerResponse;

export type GetTranslations = () => Promise<{t: TranslateFn}>;

export type SetAppLocale = (locale: string) => void;

export type GetUserFromRequest = (req: NextRequest) => Promise<UserModel | null>;

export type IsAuthenticated = (req: NextRequest) => Promise<boolean>;

export type IsSuperAdmin = (user: UserModel | null) => Promise<boolean>;

export type IsUnderMaintenance = () => Promise<boolean>;

export type GetUserPermissions = (user: UserModel | null) => Promise<string[]>;

export type IsServerResponse<TServerResponse> = (v: unknown) => v is TServerResponse;

export function createApiUtils<TServerResponse>(args: {
    ServerResponse: ServerResponseCtor<TServerResponse>;
    isServerResponse: IsServerResponse<TServerResponse>;

    getTranslations: GetTranslations;
    setAppLocale: SetAppLocale;

    getUserFromRequest: GetUserFromRequest;
    isAuthenticated: IsAuthenticated;
    isSuperAdmin: IsSuperAdmin;
    isUnderMaintenance: IsUnderMaintenance;
    getUserPermissions: GetUserPermissions;
}) {
    const {
        ServerResponse,
        isServerResponse,
        getTranslations,
        setAppLocale,
        getUserFromRequest,
        isAuthenticated,
        isSuperAdmin,
        isUnderMaintenance,
        getUserPermissions,
    } = args;

    /* ------------------------- Error handling wrapper ------------------------ */

    const withErrorHandling = <A extends unknown[]>(
        fn: (...args: A) => Promise<TServerResponse>,
    ) => {
        return async (...args: A): Promise<TServerResponse> => {
            try {
                return await fn(...args);
            } catch (e) {
                ConsoleUtils.error(e);
                const {t} = await getTranslations();
                return new ServerResponse(
                    {
                        error: {
                            title: t("serverError"),
                            message: t("serverErrorMessageWithoutCode"),
                        },
                    },
                    500,
                ) as unknown as TServerResponse;
            }
        };
    };

    /* --------------------------- Config/permissions -------------------------- */

    function withConfig<B>(
        routeFunc: (req: NextRequest, body?: B) => Promise<TServerResponse>,
        config: RouteConfigLike,
    ) {
        return async (req: NextRequest, body?: B): Promise<TServerResponse> => {
            if ((config.apiUrl ?? "").toLowerCase() !== "/api/auth/refresh") {
                const [translations, user, isUserAuthenticated, maintenanceMode] = await Promise.all([
                    getTranslations(),
                    getUserFromRequest(req),
                    isAuthenticated(req),
                    isUnderMaintenance(),
                ]);

                const {t} = translations;
                const superAdmin = await isSuperAdmin(user);

                if (maintenanceMode && !config.canPassMaintenanceMode && !superAdmin) {
                    return new ServerResponse(
                        errorResponse({
                            title: t("underMaintenance"),
                            message: t("underMaintenanceMessage"),
                        }),
                        503,
                    );
                }

                if (config.requiresAuth && !isUserAuthenticated) {
                    return new ServerResponse(
                        errorResponse({
                            title: t("unauthorized"),
                            message: t("unauthorizedMessage"),
                        }),
                        401,
                    );
                }

                if (config.requiresGuest && isUserAuthenticated) {
                    return new ServerResponse(
                        errorResponse({
                            title: t("403Forbidden"),
                            message: t("youAreNotAuthorizedMessage"),
                        }),
                        403,
                    );
                }

                if ((config.requiredPermission?.length ?? 0) > 0 && !superAdmin) {
                    const perms = await getUserPermissions(user);
                    const allowed = config.requiredPermission!.some((p) => perms.includes(p));
                    if (!allowed) {
                        return new ServerResponse(
                            errorResponse({
                                title: t("403Forbidden"),
                                message: t("youAreNotAuthorizedMessage"),
                            }),
                            403,
                        );
                    }
                }
            }

            return routeFunc(req, body);
        };
    }

    /* ----------------------------- Locale wrapper ---------------------------- */

    function withChangeLocale<B>(
        routeFunc: (request: NextRequest, body?: B) => Promise<TServerResponse>,
    ) {
        return async (req: NextRequest, body?: B): Promise<TServerResponse> => {
            const locale = req.headers.get("Accept-Language");
            if (locale) setAppLocale(locale);
            return routeFunc(req, body);
        };
    }

    /* ----------------------------- Body validation --------------------------- */

    async function validateRequestBody<B>(
        req: NextRequest,
        bodyType: BodyType,
        t: TranslateFn,
    ): Promise<B | TServerResponse> {
        try {
            switch (bodyType) {
                case "json":
                    return (await req.json()) as unknown as B;
                case "form":
                    return (await req.formData()) as unknown as B;
                case "text":
                    return (await req.text()) as unknown as B;
                default:
                    return undefined as unknown as B;
            }
        } catch {
            return new ServerResponse(
                errorResponse({
                    title: t("error"),
                    message: t("validationRequestBodyFormat", {
                        expectedFormat: bodyType,
                    }),
                }),
                400,
            );
        }
    }

    /* ------------------------------- withAll HOF ------------------------------ */

    function withAll<J = unknown>(
        routeFunc: (req: NextRequest, body?: InferBody<BodyType, J>) => Promise<TServerResponse>,
        config: RouteConfigLike,
    ) {
        return withErrorHandling(async (req: NextRequest): Promise<TServerResponse> => {
            const {t} = await getTranslations();

            const bodyOrError = await validateRequestBody<InferBody<BodyType, J>>(req, config.bodyType, t);
            if (isServerResponse(bodyOrError)) return bodyOrError;

            const withLocale = withChangeLocale(routeFunc);
            const withPerms = withConfig<InferBody<BodyType, J>>(withLocale, config);
            return withPerms(req, bodyOrError as InferBody<BodyType, J>);
        });
    }

    /* -------------------------- Typed HTTP error types ------------------------ */

    class HttpError extends Error {
        readonly status: number;
        readonly code?: string;
        readonly details?: unknown;

        constructor(message: string, status = 500, code?: string, details?: unknown) {
            super(message);
            this.name = new.target.name;
            this.status = status;
            this.code = code;
            this.details = details;
            const anyError = Error as unknown as {
                captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
            };
            if (typeof anyError.captureStackTrace === "function") {
                anyError.captureStackTrace(this, new.target);
            }
        }
    }

    class BadRequestError extends HttpError {
        constructor(messageOrKey: string, opts?: {message?: string; details?: unknown}) {
            super(opts?.message ?? messageOrKey, 400, opts?.message ? messageOrKey : undefined, opts?.details);
        }
    }

    function assertDefined<T>(
        value: T | null | undefined,
        messageOrKey: string,
        opts?: {message?: string; details?: unknown},
    ): asserts value is T {
        if (value == null) throw new BadRequestError(messageOrKey, opts);
    }

    /* -------------------------- Default permission helper ------------------------ */

    async function defaultGetUserPermissions(user: UserModel | null): Promise<string[]> {
        return user?.permissions.map((p: PermissionModel) => p.permissionKey) ?? [];
    }

    return {
        withErrorHandling,
        withAll,
        HttpError,
        BadRequestError,
        assertDefined,
        defaultGetUserPermissions,
    };
}
