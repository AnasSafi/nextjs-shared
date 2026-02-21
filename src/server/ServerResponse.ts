import {NextResponse} from "next/server";
import JSONbig from "json-bigint";
import {ServerErrorModel, ServerSuccessModel} from "../models/core/formModels";

export class ServerResponse<T = unknown> extends NextResponse {
    constructor(
        body: ServerSuccessModel<T> | ServerErrorModel,
        status: number = 200,
        extraHeaders?: Record<string, string>,
    ) {
        const defaultHeaders = {
            "Content-Type": "application/json",
        };

        const headers = {
            ...defaultHeaders,
            ...extraHeaders,
        };

        const responseBody = JSONbig.stringify(body);

        super(responseBody, {
            status,
            headers,
        });
    }

    setHeader(key: string, value: string) {
        this.headers.set(key, value);
    }

    setCookie(options: {
        name: string;
        value: string;
        secure?: boolean;
        httpOnly?: boolean;
        maxAge?: number;
        path?: string;
    }) {
        this.cookies.set({
            ...options,
            secure: options.secure ?? (process.env.NODE_ENV === "production"),
            httpOnly: options.httpOnly ?? true,
            path: "/",
        });
    }
}