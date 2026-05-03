"use client";

import React, {useMemo} from "react";
import type {JSX} from "react";
import {
    createConvertMarkdownTextToHtml,
    type MarkdownTextToHtmlDeps,
} from "../../utils/markdown/markdownTextRenderers";

export type MarkdownTextViewDeps = MarkdownTextToHtmlDeps & {
    sanitizeHtml: (html: string) => string;
};

type Props = {text: string};

export function createMarkdownTextView(deps: MarkdownTextViewDeps) {
    const {
        sanitizeHtml,
        ...convertDeps
    } = deps;

    const convertMarkdownToHtml = createConvertMarkdownTextToHtml(convertDeps);

    return function MarkdownTextView({text}: Props): JSX.Element | null {
        const sanitizedHtml: string = useMemo(() => {
            if (!text || text.length === 0) return "";
            const html = convertMarkdownToHtml({text, target: "web"});
            return sanitizeHtml(html);
        }, [text]);

        if (!sanitizedHtml) return null;

        return (
            <div
                className="whitespace-pre-line"
                dangerouslySetInnerHTML={{__html: sanitizedHtml}}
            />
        );
    };
}
