import type {MultiLangValue} from "../../models/core/localeModels";
import {InsertMarkdownImageResult, MarkdownCaptionPosition} from "../../models/markdown/markdownImageModels";
import {getStringFromMultiLangValueByLang} from "../multiLangValueReadUtils";
import {
    ALL_ALIGN_TOKENS,
    CAPTION_UI_POSITION_IDS, captionUiToAttr,
    MARKDOWN_CAPTION_POSITIONS
} from "../../models/markdown/markdownTokens";
import {ATTR_BLOCK_RE_FRAGMENT, parseAttrBlock} from "../markdownUtils";

export type ImageToken = {
    start: number;
    end: number;
    alt: string;
    src: string;
    title?: string;
    link?: string;
    attrs?: Record<string, string>;
};

export function parseMLAttr(raw?: string): MultiLangValue | undefined {
    if (!raw) return undefined;
    try {
        return JSON.parse(raw) as MultiLangValue;
    } catch {}
    try {
        return JSON.parse(decodeURIComponent(raw)) as MultiLangValue;
    } catch {
        return undefined;
    }
}

export function escapeForDoubleQuotedAttr(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildMarkdownImage(
    payload: InsertMarkdownImageResult,
    currentLang?: string,
): string {
    const altText =
        (payload.alt &&
            getStringFromMultiLangValueByLang(payload.alt as MultiLangValue, currentLang)) ||
        "";

    const escapedAlt = altText.replace(/]/g, "\\]");
    const captionText =
        (payload.caption &&
            getStringFromMultiLangValueByLang(payload.caption as MultiLangValue, currentLang)) ||
        "";

    const titlePart =
        captionText.length > 0
            ? ` "${captionText.replace(/"/g, '\\"')}"`
            : "";

    const srcPart = payload.mediaId ? `media:${payload.mediaId}` : payload.url;
    const base = `![${escapedAlt}](${srcPart}${titlePart})`;

    const attrs: string[] = [];

    if (payload.align && (ALL_ALIGN_TOKENS as readonly string[]).includes(payload.align)) {
        attrs.push(`align=${payload.align}`);
    }

    let captionAttr: MarkdownCaptionPosition | undefined;
    const cp = payload.captionPosition as unknown;

    if (typeof cp === "string") {
        if ((CAPTION_UI_POSITION_IDS as readonly string[]).includes(cp)) {
            captionAttr = captionUiToAttr(cp as "top" | "bottom")!;
        } else if ((MARKDOWN_CAPTION_POSITIONS as readonly string[]).includes(cp)) {
            captionAttr = cp as MarkdownCaptionPosition;
        }
    }

    if (captionAttr) attrs.push(`caption-position=${captionAttr}`);
    if (payload.link) attrs.push(`link=${encodeURI(payload.link)}`);

    if (payload.alt) {
        const altJson = escapeForDoubleQuotedAttr(JSON.stringify(payload.alt));
        attrs.push(`alt-json="${altJson}"`);
    }

    if (payload.caption) {
        const capJson = escapeForDoubleQuotedAttr(JSON.stringify(payload.caption));
        attrs.push(`caption-json="${capJson}"`);
    }

    if (payload.size) attrs.push(`size=${payload.size}`);
    if (typeof payload.width === "number") attrs.push(`width=${payload.width}`);
    if (typeof payload.height === "number") attrs.push(`height=${payload.height}`);
    if (payload.ratio?.trim()) attrs.push(`ratio="${payload.ratio.trim()}"`);
    if (payload.fit) attrs.push(`fit=${payload.fit}`);

    const attrsBlock = attrs.length > 0 ? `{${attrs.join(" ")}}` : "";
    return `${base}${attrsBlock}`;
}

const ATTR_BLOCK = ATTR_BLOCK_RE_FRAGMENT;

export function scanImageTokens(text: string): ImageToken[] {
    const tokens: ImageToken[] = [];

    const linked = new RegExp(
        String.raw`\[!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)\]\((\S+?)\)(${ATTR_BLOCK})?`,
        "g",
    );

    const plain = new RegExp(
        String.raw`!\[(.*?)\]\((\S+?)(?:\s+"(.*?)")?\)(${ATTR_BLOCK})?`,
        "g",
    );

    for (const re of [linked, plain]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;

        while ((m = re.exec(text)) !== null) {
            const start = m.index;
            const end = start + m[0].length;

            if (re === linked) {
                tokens.push({
                    start,
                    end,
                    alt: m[1] ?? "",
                    src: m[2] ?? "",
                    title: m[3] ?? undefined,
                    link: m[4] ?? undefined,
                    attrs: parseAttrBlock(m[5]),
                });
            } else {
                tokens.push({
                    start,
                    end,
                    alt: m[1] ?? "",
                    src: m[2] ?? "",
                    title: m[3] ?? undefined,
                    attrs: parseAttrBlock(m[4]),
                });
            }
        }
    }

    tokens.sort((a, b) => a.start - b.start);
    return tokens;
}

export function findImageTokenAtStrict(text: string, caretIndex: number): ImageToken | null {
    const tokens = scanImageTokens(text);
    return tokens.find((t) => caretIndex >= t.start && caretIndex <= t.end) ?? null;
}

export function resolveMediaSrc(src: string, attrs?: Record<string, string>): string {
    if (src.startsWith("media:")) {
        const id = src.slice("media:".length);
        if (id) return `/api/media/${encodeURIComponent(id)}`;
    }
    const idFromAttr = attrs?.["media-id"];
    if (idFromAttr?.trim()) {
        return `/api/media/${encodeURIComponent(idFromAttr)}`;
    }
    return src;
}
