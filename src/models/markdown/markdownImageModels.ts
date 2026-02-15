import type {
    MarkdownAlignmentAll as MarkdownAlignment,
    MarkdownCaptionPosition,
    ImageSizeVariant,
    ImageObjectFit,
} from "./markdownTokens";
import {MultiLangValue} from "../core/localeModels";

// Re-export variants for backward-compat imports from this module.
export {IMAGE_SIZE_VARIANTS, IMAGE_OBJECT_FIT_VARIANTS} from "./markdownTokens";
export type {MarkdownCaptionPosition, ImageSizeVariant, ImageObjectFit} from "./markdownTokens";

/** Result returned to the editor to build the markdown image token. */
export interface InsertMarkdownImageResult {
    url: string;
    mediaId?: string;
    alt?: MultiLangValue;
    caption?: MultiLangValue;
    align?: MarkdownAlignment; // includes legacy token "justify" for read-compat
    link?: string;
    captionPosition?: MarkdownCaptionPosition;

    size?: ImageSizeVariant;
    width?: number | null;
    height?: number | null;
    ratio?: string | null;
    fit?: ImageObjectFit;
}