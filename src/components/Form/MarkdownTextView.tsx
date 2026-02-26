"use client";

import React, {useMemo} from "react";
import type {JSX} from "react";
import type {MultiLangValue} from "../../models/core/localeModels";
import {LanguageConfig} from "../../i18n/languageConfigUtils";

export type MarkdownTextViewDeps = {
    sanitizeHtml: (html: string) => string;

    fallbackLng: string;
    languages: LanguageConfig[];

    ATTR_BLOCK_RE_FRAGMENT: string;
    parseAttrBlock: (attrsBlock?: string) => Record<string, string>;
    parseMLAttr: (raw?: string) => MultiLangValue | null | undefined;

    getPreferredIso3LangFromDom: (args: {
        fallbackLng: string;
        languages: LanguageConfig[];
    }) => string;

    getStringFromMultiLangValueByLang: (
        value: MultiLangValue | null | undefined,
        langCode?: string,
    ) => string;
    isLanguageRTL: (iso3: string) => boolean;

    resolveMediaSrc: (src: string, attrs?: Record<string, string>) => string;
};

type Props = {text: string};

type Align =
    | "start"
    | "center"
    | "end"
    | "left"
    | "right"
    | "justify"
    | undefined;

const mapSizeToClasses = (size?: string): string => {
    switch (size) {
        case "xs":
            return "w-24";
        case "sm":
            return "w-40";
        case "md":
            return "w-64";
        case "lg":
            return "w-96";
        case "xl":
            return "w-[36rem]";
        case "full":
            return "w-full";
        default:
            return "";
    }
};

const mapFitToClasses = (fit?: string): string => {
    switch (fit) {
        case "contain":
            return "object-contain";
        case "cover":
            return "object-cover";
        case "fill":
            return "object-fill";
        case "none":
            return "object-none";
        default:
            return "";
    }
};

const escapeAttr = (v: string): string =>
    v
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

export function createMarkdownTextView(deps: MarkdownTextViewDeps) {
    const {
        sanitizeHtml,
        fallbackLng,
        languages,
        ATTR_BLOCK_RE_FRAGMENT,
        parseAttrBlock,
        parseMLAttr,
        getPreferredIso3LangFromDom,
        getStringFromMultiLangValueByLang,
        isLanguageRTL,
        resolveMediaSrc,
    } = deps;

    const imageHtml = (params: {
        src: string;
        alt: string;
        title?: string;
        attrs?: Record<string, string>;
    }): string => {
        const {src, alt, title, attrs} = params;

        const align = attrs?.["align"] as Align;
        const link = attrs?.["link"];
        const captionPos =
            (attrs?.["caption-position"] as "above" | "below" | "overlay" | undefined) ?? "below";

        const altML = parseMLAttr(attrs?.["alt-json"]);
        const capML = parseMLAttr(attrs?.["caption-json"]);

        const preferredIso3: string =
            typeof window === "undefined"
                ? fallbackLng
                : getPreferredIso3LangFromDom({fallbackLng, languages});

        const altFinal =
            getStringFromMultiLangValueByLang(altML, preferredIso3) || alt;

        const caption =
            getStringFromMultiLangValueByLang(capML, preferredIso3) ||
            title ||
            attrs?.["caption"];

        const sizeToken = attrs?.["size"];
        const widthStr = attrs?.["width"];
        const heightStr = attrs?.["height"];
        const ratio = attrs?.["ratio"];
        const fit = attrs?.["fit"];

        const widthNum = widthStr && /^\d+$/.test(widthStr) ? Number(widthStr) : undefined;
        const heightNum = heightStr && /^\d+$/.test(heightStr) ? Number(heightStr) : undefined;

        const resolvedSrc = resolveMediaSrc(src, attrs);

        const classParts: string[] = [];
        classParts.push("max-w-full");
        if (!heightNum) classParts.push("h-auto");
        if (!widthNum && !heightNum) {
            const sizeClass = mapSizeToClasses(sizeToken);
            if (sizeClass) classParts.push(sizeClass);
        }
        const fitClass = mapFitToClasses(fit);
        if (fitClass) classParts.push(fitClass);

        const rtl = isLanguageRTL(preferredIso3);
        const alignClass =
            align === "center"
                ? "mx-auto"
                : align === "left"
                    ? "mr-auto"
                    : align === "right"
                        ? "ml-auto"
                        : align === "start"
                            ? rtl
                                ? "ml-auto"
                                : "mr-auto"
                            : align === "end"
                                ? rtl
                                    ? "mr-auto"
                                    : "ml-auto"
                                : "";
        if (alignClass) classParts.push(alignClass);

        const imgClasses = classParts.join(" ").trim();

        const widthAttr = widthNum ? ` width="${widthNum}"` : "";
        const heightAttr = heightNum ? ` height="${heightNum}"` : "";

        const dataAttrs = [
            sizeToken ? `data-size="${escapeAttr(sizeToken)}"` : "",
            fit ? `data-fit="${escapeAttr(fit)}"` : "",
            ratio ? `data-ratio="${escapeAttr(ratio)}"` : "",
            widthNum ? `data-width="${widthNum}"` : "",
            heightNum ? `data-height="${heightNum}"` : "",
        ]
            .filter(Boolean)
            .join(" ");

        const imgTag =
            `<img src="${escapeAttr(resolvedSrc)}" alt="${escapeAttr(altFinal)}"` +
            `${caption ? ` title="${escapeAttr(caption)}"` : ""}` +
            ` class="${imgClasses}"${widthAttr}${heightAttr} ${dataAttrs} ` +
            `loading="lazy" referrerpolicy="no-referrer" />`;

        const wrappedImg = link
            ? `<a href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
            : imgTag;

        if (!caption) return wrappedImg;

        const figcaption =
            `<figcaption class="mt-1 text-xs text-neutral-500 text-center">` +
            `${escapeAttr(caption)}</figcaption>`;

        if (captionPos === "above") return `<figure class="m-0">${figcaption}${wrappedImg}</figure>`;
        if (captionPos === "overlay") {
            return (
                `<figure class="relative inline-block m-0">${wrappedImg}` +
                `<figcaption class="absolute bottom-1 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">` +
                `${escapeAttr(caption)}</figcaption></figure>`
            );
        }
        return `<figure class="m-0">${wrappedImg}${figcaption}</figure>`;
    };

    const convertMarkdownToHtml = (text: string): string => {
        let convertedText: string = text;

        convertedText = convertedText.replace(/<<B>>(.*?)<<\/B>>/g, "<b>$1</b>");
        convertedText = convertedText.replace(/<<I>>(.*?)<<\/I>>/g, "<i>$1</i>");
        convertedText = convertedText.replace(/<<U>>(.*?)<<\/U>>/g, "<u>$1</u>");
        convertedText = convertedText.replace(/<<S>>(.*?)<<\/S>>/g, "<s>$1</s>");
        convertedText = convertedText.replace(/<<SUB>>(.*?)<<\/SUB>>/g, "<sub>$1</sub>");
        convertedText = convertedText.replace(/<<SUP>>(.*?)<<\/SUP>>/g, "<sup>$1</sup>");

        convertedText = convertedText.replace(/<<H1>>(.*?)<<\/H1>>/g, '<h1 class="text-5xl font-extrabold">$1</h1>');
        convertedText = convertedText.replace(/<<H2>>(.*?)<<\/H2>>/g, '<h2 class="text-4xl font-bold">$1</h2>');
        convertedText = convertedText.replace(/<<H3>>(.*?)<<\/H3>>/g, '<h3 class="text-3xl font-bold">$1</h3>');
        convertedText = convertedText.replace(/<<H4>>(.*?)<<\/H4>>/g, '<h4 class="text-2xl font-bold">$1</h4>');
        convertedText = convertedText.replace(/<<H5>>(.*?)<<\/H5>>/g, '<h5 class="text-xl font-bold">$1</h5>');
        convertedText = convertedText.replace(/<<H6>>(.*?)<<\/H6>>/g, '<h6 class="text-lg font-bold">$1</h6>');

        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_JUSTIFY>>(.*?)<<\/TEXT_ALIGN_JUSTIFY>>/g,
            '<div class="text-justify">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_LEFT>>(.*?)<<\/TEXT_ALIGN_LEFT>>/g,
            '<div class="text-left">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_CENTER>>(.*?)<<\/TEXT_ALIGN_CENTER>>/g,
            '<div class="text-center">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_RIGHT>>(.*?)<<\/TEXT_ALIGN_RIGHT>>/g,
            '<div class="text-right">$1</div>',
        );

        convertedText = convertedText.replace(/<<UL>>(.*?)<<\/UL>>/gs, (_: string, listItem: string) => {
            const listItems = listItem.split("\n").map((line: string) => {
                if (line.startsWith("<<LI>>") && line.endsWith("<</LI>>")) {
                    return `<li>${line.substring(6, line.length - 7)}</li>`;
                }
                return line;
            });
            return `<ul class="list-disc ps-10">${listItems.join("")}</ul>`;
        });

        convertedText = convertedText.replace(/<<OL>>(.*?)<<\/OL>>/gs, (_: string, listItem: string) => {
            const listItems = listItem.split("\n").map((line: string) => {
                if (line.startsWith("<<LI>>") && line.endsWith("<</LI>>")) {
                    return `<li>${line.substring(6, line.length - 7)}</li>`;
                }
                return line;
            });
            return `<ol class="list-decimal ps-10">${listItems.join("")}</ol>`;
        });

        const ATTR_BLOCK = ATTR_BLOCK_RE_FRAGMENT;

        convertedText = convertedText.replace(
            new RegExp(String.raw`\[!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)\]\((\S+?)\)(${ATTR_BLOCK})?`, "g"),
            (_m: string, alt: string, src: string, title: string, link: string, attrsBlock?: string) => {
                const attrs = parseAttrBlock(attrsBlock);
                attrs["link"] = link;
                return imageHtml({src, alt, title, attrs});
            },
        );

        convertedText = convertedText.replace(
            new RegExp(String.raw`!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)(${ATTR_BLOCK})?`, "g"),
            (_m: string, alt: string, src: string, title: string, attrsBlock?: string) => {
                const attrs = parseAttrBlock(attrsBlock);
                return imageHtml({src, alt, title, attrs});
            },
        );

        return convertedText;
    };

    return function MarkdownTextView({text}: Props): JSX.Element | null {
        const sanitizedHtml: string = useMemo(() => {
            if (!text || text.length === 0) return "";
            const html = convertMarkdownToHtml(text);
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
