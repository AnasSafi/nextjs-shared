// Single source of truth for all literal tokens used by markdown image features.

/// Sources
export const IMAGE_SOURCE_IDS = ["device", "httpUrl"] as const;
export type ImageSourceId = (typeof IMAGE_SOURCE_IDS)[number];

/// Alignments (core + legacy)
export const ALIGN_TOKENS = ["start", "center", "end", "left", "right"] as const;
export const LEGACY_ALIGN_TOKENS = ["justify"] as const;
export const ALL_ALIGN_TOKENS = [...ALIGN_TOKENS, ...LEGACY_ALIGN_TOKENS] as const;

/** Alignments accepted from UI and persisted moving forward (no legacy here). */
export type MarkdownAlignment = (typeof ALIGN_TOKENS)[number];

/** Alignments accepted anywhere (includes legacy "justify" for read-compat). */
export type MarkdownAlignmentAll = (typeof ALL_ALIGN_TOKENS)[number];

/// Caption positions
/** UI positions shown in forms. */
export const CAPTION_UI_POSITION_IDS = ["top", "bottom"] as const;
export type CaptionUiPositionId = (typeof CAPTION_UI_POSITION_IDS)[number];

/** Attribute/render positions persisted in tokens/renderer. */
export const MARKDOWN_CAPTION_POSITIONS = ["above", "below", "overlay"] as const;
export type MarkdownCaptionPosition = (typeof MARKDOWN_CAPTION_POSITIONS)[number];

/// Sizes and object-fit
export const IMAGE_SIZE_VARIANTS = ["xs", "sm", "md", "lg", "xl", "full"] as const;
export type ImageSizeVariant = (typeof IMAGE_SIZE_VARIANTS)[number];

export const IMAGE_OBJECT_FIT_VARIANTS = ["contain", "cover", "fill", "none"] as const;
export type ImageObjectFit = (typeof IMAGE_OBJECT_FIT_VARIANTS)[number];

/// Defaults
export const DEFAULT_SOURCE: ImageSourceId = "device";
export const DEFAULT_CAPTION_UI_POSITION: CaptionUiPositionId = "bottom";

/// Helpers
export function isAlignToken(v?: string | null): v is MarkdownAlignmentAll {
    return !!v && (ALL_ALIGN_TOKENS as readonly string[]).includes(v);
}

/** Map UI position to attribute/render position. */
export function captionUiToAttr(
    ui?: CaptionUiPositionId | "overlay" | null,
): MarkdownCaptionPosition | undefined {
    if (!ui) return undefined;
    if (ui === "top") return "above";
    if (ui === "bottom") return "below";
    if (ui === "overlay") return "overlay";
    return undefined;
}

/** Map attribute/render position to UI position. Overlay falls back to bottom. */
export function captionAttrToUi(
    attr?: MarkdownCaptionPosition | string | null,
): CaptionUiPositionId {
    return attr === "above" ? "top" : "bottom";
}