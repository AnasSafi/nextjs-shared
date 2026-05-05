import type {MultiLangValue} from "../../models/core/localeModels";
import type {LanguageConfig} from "../../i18n/languageConfigUtils";

export type MarkdownTextToHtmlDeps = {
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

export type MarkdownTextToHtmlTarget = "web" | "email";

export type ConvertMarkdownTextToHtmlParams = {
    text: string;
    target?: MarkdownTextToHtmlTarget;
    preferredIso3Lang?: string;
    wrapEmailContainer?: boolean;
    emailLang?: string;
    emailDir?: "rtl" | "ltr";
    emailBaseUrl?: string;
};

export type MarkdownEmailHtmlConverterDeps = MarkdownTextToHtmlDeps & {
    sanitizeHtml?: (html: string) => string;
};

export type MarkdownEmailHtmlConverterOptions = {
    preferredIso3Lang?: string;
    sanitizeHtml?: (html: string) => string;
    wrapInContainer?: boolean;
    emailLang?: string;
    emailDir?: "rtl" | "ltr";
    emailBaseUrl?: string;
};

export type SafeMarkdownEmailHtmlConverterDeps = MarkdownTextToHtmlDeps & {
    sanitizeHtml: (html: string) => string;
};

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

const mapSizeToEmailWidth = (size?: string): number | undefined => {
    switch (size) {
        case "xs":
            return 96;
        case "sm":
            return 160;
        case "md":
            return 256;
        case "lg":
            return 384;
        case "xl":
            return 576;
        case "full":
            return 600;
        default:
            return undefined;
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

const mapFitToEmailStyle = (fit?: string): string | undefined => {
    switch (fit) {
        case "contain":
        case "cover":
        case "fill":
        case "none":
            return fit;
        default:
            return undefined;
    }
};

const escapeAttr = (v: string): string =>
    v
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const mapHeadingToEmailStyle = (token: "H1" | "H2" | "H3" | "H4" | "H5" | "H6"): string => {
    switch (token) {
        case "H1":
            return "font-size:30px;line-height:1.2;font-weight:800;margin:0 0 12px;";
        case "H2":
            return "font-size:26px;line-height:1.25;font-weight:700;margin:0 0 10px;";
        case "H3":
            return "font-size:22px;line-height:1.3;font-weight:700;margin:0 0 9px;";
        case "H4":
            return "font-size:20px;line-height:1.35;font-weight:700;margin:0 0 8px;";
        case "H5":
            return "font-size:18px;line-height:1.4;font-weight:700;margin:0 0 7px;";
        case "H6":
            return "font-size:16px;line-height:1.4;font-weight:700;margin:0 0 6px;";
    }
};

const resolveEmailAlign = (align: Align, rtl: boolean): string | undefined => {
    if (align === "center") return "center";
    if (align === "left") return "left";
    if (align === "right") return "right";
    if (align === "start") return rtl ? "right" : "left";
    if (align === "end") return rtl ? "left" : "right";
    return undefined;
};

const buildImageMarginStyles = (align: Align, rtl: boolean): string[] => {
    switch (align) {
        case "center":
            return ["display:block", "margin-left:auto", "margin-right:auto"];
        case "left":
            return ["display:block", "margin-left:0", "margin-right:auto"];
        case "right":
            return ["display:block", "margin-left:auto", "margin-right:0"];
        case "start":
            return rtl
                ? ["display:block", "margin-left:auto", "margin-right:0"]
                : ["display:block", "margin-left:0", "margin-right:auto"];
        case "end":
            return rtl
                ? ["display:block", "margin-left:0", "margin-right:auto"]
                : ["display:block", "margin-left:auto", "margin-right:0"];
        default:
            return [];
    }
};

const URL_PROTOCOL_RE = /^([a-zA-Z][a-zA-Z\d+\-.]*):/;

const getUrlProtocol = (value: string): string | undefined => {
    const match = value.match(URL_PROTOCOL_RE);
    if (!match) return undefined;
    return match[1].toLowerCase();
};

const isUnsafeProtocol = (protocol: string | undefined): boolean =>
    protocol === "javascript" || protocol === "data" || protocol === "vbscript";

const isSafeHrefProtocol = (protocol: string | undefined): boolean =>
    protocol === "http" ||
    protocol === "https" ||
    protocol === "mailto" ||
    protocol === "tel";

const isValidAbsoluteHttpUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.host);
    } catch {
        return false;
    }
};

export function sanitizeMarkdownHref(
    rawHref: string | undefined,
    target: MarkdownTextToHtmlTarget,
): string | null {
    if (!rawHref) return null;

    const href = rawHref.trim();
    if (!href) return null;

    const protocol = getUrlProtocol(href);
    if (isUnsafeProtocol(protocol)) return null;

    if (protocol) {
        if (!isSafeHrefProtocol(protocol)) return null;
        if (target === "email" && (protocol === "http" || protocol === "https")) {
            return isValidAbsoluteHttpUrl(href) ? href : null;
        }
        return href;
    }

    if (target === "email") return null;
    return href;
}

export function sanitizeMarkdownImageSrc(
    rawSrc: string,
    target: MarkdownTextToHtmlTarget,
): string | null {
    const src = rawSrc.trim();
    if (!src) return null;

    const protocol = getUrlProtocol(src);
    if (isUnsafeProtocol(protocol)) return null;

    if (target === "email") {
        if (protocol !== "http" && protocol !== "https") return null;
        return isValidAbsoluteHttpUrl(src) ? src : null;
    }

    return src;
}

const absolutizeEmailSrc = (
    rawSrc: string,
    emailBaseUrl: string | undefined,
): string => {
    const src = rawSrc.trim();
    if (!src || !emailBaseUrl) return src;
    if (getUrlProtocol(src)) return src;

    try {
        const base = new URL(emailBaseUrl.trim());
        if (base.protocol !== "http:" && base.protocol !== "https:") return src;
        return new URL(src, base).toString();
    } catch {
        return src;
    }
};

export function createConvertMarkdownTextToHtml(deps: MarkdownTextToHtmlDeps) {
    const {
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

    const resolvePreferredIso3Lang = (preferredIso3Lang?: string): string => {
        if (preferredIso3Lang && preferredIso3Lang.trim()) return preferredIso3Lang.trim();
        if (typeof window === "undefined") return fallbackLng;
        return getPreferredIso3LangFromDom({fallbackLng, languages});
    };

    const imageHtml = (params: {
        src: string;
        alt: string;
        title?: string;
        attrs?: Record<string, string>;
        target: MarkdownTextToHtmlTarget;
        preferredIso3Lang?: string;
        emailBaseUrl?: string;
    }): string => {
        const {src, alt, title, attrs, target, preferredIso3Lang, emailBaseUrl} = params;

        const align = attrs?.["align"] as Align;
        const link = attrs?.["link"];
        const captionPos =
            (attrs?.["caption-position"] as "above" | "below" | "overlay" | undefined) ?? "below";

        const altML = parseMLAttr(attrs?.["alt-json"]);
        const capML = parseMLAttr(attrs?.["caption-json"]);

        const preferredIso3 = resolvePreferredIso3Lang(preferredIso3Lang);

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
        const emailReadySrc =
            target === "email"
                ? absolutizeEmailSrc(resolvedSrc, emailBaseUrl)
                : resolvedSrc;
        const sanitizedSrc = sanitizeMarkdownImageSrc(emailReadySrc, target);
        if (!sanitizedSrc) return "";

        const sanitizedHref = sanitizeMarkdownHref(link, target);
        const rtl = isLanguageRTL(preferredIso3);

        if (target === "web") {
            const classParts: string[] = [];
            classParts.push("max-w-full");
            if (!heightNum) classParts.push("h-auto");
            if (!widthNum && !heightNum) {
                const sizeClass = mapSizeToClasses(sizeToken);
                if (sizeClass) classParts.push(sizeClass);
            }
            const fitClass = mapFitToClasses(fit);
            if (fitClass) classParts.push(fitClass);

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
                `<img src="${escapeAttr(sanitizedSrc)}" alt="${escapeAttr(altFinal)}"` +
                `${caption ? ` title="${escapeAttr(caption)}"` : ""}` +
                ` class="${imgClasses}"${widthAttr}${heightAttr} ${dataAttrs} ` +
                `loading="lazy" referrerpolicy="no-referrer" />`;

            const wrappedImg = sanitizedHref
                ? `<a href="${escapeAttr(sanitizedHref)}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
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
        }

        const emailWidth = widthNum ?? mapSizeToEmailWidth(sizeToken);
        const objectFit = mapFitToEmailStyle(fit);
        const alignStyle = resolveEmailAlign(align, rtl);

        const imgStyleParts: string[] = [
            "max-width:100%",
            "border:0",
            "outline:none",
            "text-decoration:none",
        ];

        if (emailWidth) imgStyleParts.push(`width:${emailWidth}px`);
        if (heightNum) {
            imgStyleParts.push(`height:${heightNum}px`);
        } else {
            imgStyleParts.push("height:auto");
        }
        if (objectFit) imgStyleParts.push(`object-fit:${objectFit}`);
        imgStyleParts.push(...buildImageMarginStyles(align, rtl));

        const imgStyle = imgStyleParts.join(";");
        const widthAttr = emailWidth ? ` width="${emailWidth}"` : "";
        const heightAttr = heightNum ? ` height="${heightNum}"` : "";

        const imgTag =
            `<img src="${escapeAttr(sanitizedSrc)}" alt="${escapeAttr(altFinal)}"` +
            `${caption ? ` title="${escapeAttr(caption)}"` : ""}` +
            ` style="${imgStyle}"${widthAttr}${heightAttr} />`;

        const wrappedImg = sanitizedHref
            ? `<a href="${escapeAttr(sanitizedHref)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">${imgTag}</a>`
            : imgTag;

        if (!caption) return wrappedImg;

        const captionStyle = [
            "margin-top:4px",
            "font-size:12px",
            "line-height:1.4",
            "color:#737373",
            `text-align:${alignStyle ?? "center"}`,
        ].join(";");

        const captionNode = `<div style="${captionStyle}">${escapeAttr(caption)}</div>`;

        if (captionPos === "above") return `<div style="margin:0">${captionNode}${wrappedImg}</div>`;
        return `<div style="margin:0">${wrappedImg}${captionNode}</div>`;
    };

    return function convertMarkdownTextToHtml(
        params: ConvertMarkdownTextToHtmlParams,
    ): string {
        const {
            text,
            target = "web",
            preferredIso3Lang,
            wrapEmailContainer = true,
            emailLang,
            emailDir,
            emailBaseUrl,
        } = params;

        if (!text || text.length === 0) return "";

        const normalizedPreferredIso3 =
            preferredIso3Lang?.trim() || undefined;
        const normalizedEmailBaseUrl =
            emailBaseUrl?.trim() || undefined;
        const resolvedPreferredIso3 =
            target === "email" || normalizedPreferredIso3
                ? resolvePreferredIso3Lang(normalizedPreferredIso3)
                : undefined;
        const resolvedEmailLang = emailLang?.trim() || resolvedPreferredIso3 || fallbackLng;
        const resolvedEmailDir: "rtl" | "ltr" =
            emailDir ?? (isLanguageRTL(resolvedEmailLang) ? "rtl" : "ltr");
        const emailListPaddingStyle =
            resolvedEmailDir === "rtl"
                ? "padding-right:24px;padding-left:0"
                : "padding-left:24px;padding-right:0";

        let convertedText: string = text;

        convertedText = convertedText.replace(/<<B>>(.*?)<<\/B>>/g, "<b>$1</b>");
        convertedText = convertedText.replace(/<<I>>(.*?)<<\/I>>/g, "<i>$1</i>");
        convertedText = convertedText.replace(/<<U>>(.*?)<<\/U>>/g, "<u>$1</u>");
        convertedText = convertedText.replace(/<<S>>(.*?)<<\/S>>/g, "<s>$1</s>");
        convertedText = convertedText.replace(/<<SUB>>(.*?)<<\/SUB>>/g, "<sub>$1</sub>");
        convertedText = convertedText.replace(/<<SUP>>(.*?)<<\/SUP>>/g, "<sup>$1</sup>");

        convertedText = convertedText.replace(
            /<<H1>>(.*?)<<\/H1>>/g,
            target === "email"
                ? `<h1 style="${mapHeadingToEmailStyle("H1")}">$1</h1>`
                : '<h1 class="text-5xl font-extrabold">$1</h1>',
        );
        convertedText = convertedText.replace(
            /<<H2>>(.*?)<<\/H2>>/g,
            target === "email"
                ? `<h2 style="${mapHeadingToEmailStyle("H2")}">$1</h2>`
                : '<h2 class="text-4xl font-bold">$1</h2>',
        );
        convertedText = convertedText.replace(
            /<<H3>>(.*?)<<\/H3>>/g,
            target === "email"
                ? `<h3 style="${mapHeadingToEmailStyle("H3")}">$1</h3>`
                : '<h3 class="text-3xl font-bold">$1</h3>',
        );
        convertedText = convertedText.replace(
            /<<H4>>(.*?)<<\/H4>>/g,
            target === "email"
                ? `<h4 style="${mapHeadingToEmailStyle("H4")}">$1</h4>`
                : '<h4 class="text-2xl font-bold">$1</h4>',
        );
        convertedText = convertedText.replace(
            /<<H5>>(.*?)<<\/H5>>/g,
            target === "email"
                ? `<h5 style="${mapHeadingToEmailStyle("H5")}">$1</h5>`
                : '<h5 class="text-xl font-bold">$1</h5>',
        );
        convertedText = convertedText.replace(
            /<<H6>>(.*?)<<\/H6>>/g,
            target === "email"
                ? `<h6 style="${mapHeadingToEmailStyle("H6")}">$1</h6>`
                : '<h6 class="text-lg font-bold">$1</h6>',
        );

        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_JUSTIFY>>(.*?)<<\/TEXT_ALIGN_JUSTIFY>>/g,
            target === "email"
                ? '<div style="text-align:justify">$1</div>'
                : '<div class="text-justify">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_LEFT>>(.*?)<<\/TEXT_ALIGN_LEFT>>/g,
            target === "email"
                ? '<div style="text-align:left">$1</div>'
                : '<div class="text-left">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_CENTER>>(.*?)<<\/TEXT_ALIGN_CENTER>>/g,
            target === "email"
                ? '<div style="text-align:center">$1</div>'
                : '<div class="text-center">$1</div>',
        );
        convertedText = convertedText.replace(
            /<<TEXT_ALIGN_RIGHT>>(.*?)<<\/TEXT_ALIGN_RIGHT>>/g,
            target === "email"
                ? '<div style="text-align:right">$1</div>'
                : '<div class="text-right">$1</div>',
        );

        convertedText = convertedText.replace(/<<UL>>(.*?)<<\/UL>>/gs, (_: string, listItem: string) => {
            const listItems = listItem.split("\n").map((line: string) => {
                if (line.startsWith("<<LI>>") && line.endsWith("<</LI>>")) {
                    return `<li>${line.substring(6, line.length - 7)}</li>`;
                }
                return line;
            });

            if (target === "email") {
                return `<ul style="margin:0 0 14px 0;${emailListPaddingStyle};list-style-type:disc">${listItems.join("")}</ul>`;
            }
            return `<ul class="list-disc ps-10">${listItems.join("")}</ul>`;
        });

        convertedText = convertedText.replace(/<<OL>>(.*?)<<\/OL>>/gs, (_: string, listItem: string) => {
            const listItems = listItem.split("\n").map((line: string) => {
                if (line.startsWith("<<LI>>") && line.endsWith("<</LI>>")) {
                    return `<li>${line.substring(6, line.length - 7)}</li>`;
                }
                return line;
            });

            if (target === "email") {
                return `<ol style="margin:0 0 14px 0;${emailListPaddingStyle};list-style-type:decimal">${listItems.join("")}</ol>`;
            }
            return `<ol class="list-decimal ps-10">${listItems.join("")}</ol>`;
        });

        const ATTR_BLOCK = ATTR_BLOCK_RE_FRAGMENT;

        convertedText = convertedText.replace(
            new RegExp(String.raw`\[!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)\]\((\S+?)\)(${ATTR_BLOCK})?`, "g"),
            (_m: string, alt: string, src: string, title: string, link: string, attrsBlock?: string) => {
                const attrs = parseAttrBlock(attrsBlock);
                attrs["link"] = link;
                return imageHtml({
                    src,
                    alt,
                    title,
                    attrs,
                    target,
                    preferredIso3Lang: resolvedPreferredIso3,
                    emailBaseUrl: normalizedEmailBaseUrl,
                });
            },
        );

        convertedText = convertedText.replace(
            new RegExp(String.raw`!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)(${ATTR_BLOCK})?`, "g"),
            (_m: string, alt: string, src: string, title: string, attrsBlock?: string) => {
                const attrs = parseAttrBlock(attrsBlock);
                return imageHtml({
                    src,
                    alt,
                    title,
                    attrs,
                    target,
                    preferredIso3Lang: resolvedPreferredIso3,
                    emailBaseUrl: normalizedEmailBaseUrl,
                });
            },
        );

        if (target === "email" && wrapEmailContainer) {
            return (
                `<div lang="${escapeAttr(resolvedEmailLang)}" dir="${resolvedEmailDir}" style="white-space:pre-line">` +
                `${convertedText}</div>`
            );
        }

        return convertedText;
    };
}

export function createMarkdownEmailHtmlConverter(
    deps: MarkdownEmailHtmlConverterDeps,
) {
    const {sanitizeHtml: defaultSanitizeHtml, ...convertDeps} = deps;
    const convertMarkdownTextToHtml = createConvertMarkdownTextToHtml(convertDeps);

    // For production email campaigns, pass sanitizeHtml or use createSafeMarkdownEmailHtmlConverter.

    return function convertToEmailHtml(
        text: string,
        options?: MarkdownEmailHtmlConverterOptions,
    ): string {
        if (!text || text.length === 0) return "";

        const html = convertMarkdownTextToHtml({
            text,
            target: "email",
            preferredIso3Lang: options?.preferredIso3Lang,
            wrapEmailContainer: options?.wrapInContainer ?? true,
            emailLang: options?.emailLang,
            emailDir: options?.emailDir,
            emailBaseUrl: options?.emailBaseUrl,
        });

        const sanitize = options?.sanitizeHtml ?? defaultSanitizeHtml;
        return sanitize ? sanitize(html) : html;
    };
}

export function createSafeMarkdownEmailHtmlConverter(
    deps: SafeMarkdownEmailHtmlConverterDeps,
) {
    return createMarkdownEmailHtmlConverter(deps);
}
