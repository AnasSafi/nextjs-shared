import type React from "react";
import type {InputHTMLAttributes} from "react";
import type {FieldError, FieldErrorsImpl} from "react-hook-form";
import type {Merge} from "type-fest";

import type {MediaFileViewModel} from "../core/mediaModels";
import type {PaginationModel, SelectOptionModel} from "../core/dbModels";
import type {MultiLangValue} from "../core/localeModels";
import type {FormDataResponseModel} from "../core/formResponseModels";

import type {
    ImageObjectFit,
    ImageSizeVariant,
    ImageSourceId,
    MarkdownAlignment,
    CaptionUiPositionId,
} from "./markdownTokens";
import type {RHFErrorInput} from "../core/formModels";

/* ------------------------- Markdown textarea props ------------------------ */
export interface MarkdownTextAreaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
    isRequired?: boolean;
    toggleLocale?: () => void;
    formLocale?: string;
    initValue?: unknown;
    name: string;
    id?: string;
    placeholder?: string;
    tipText?: string;
    description?: string;
    className?: string;
    disabled?: boolean;
    alwaysLTR?: boolean;
    error?: RHFErrorInput;
    label?: string;
    handleInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    markdownGroups?: MarkdownGroup[];
    rows?: number;
}

export interface MarkdownGroup {
    name: string;
    items: MarkdownItem[];
}

export interface MarkdownItem {
    name: string;
}

export interface MarkdownGroupVisibility {
    name: string;
    items: { [itemName: string]: boolean };
}

/* ----------------------------- Image form models -------------------------- */
export interface SaveMarkdownImageModel {
    source: ImageSourceId;
    markdownImage?: string;
    httpUrl?: string;
    altText?: MultiLangValue;
    alignment?: MarkdownAlignment | null;
    caption?: MultiLangValue;
    captionPosition?: CaptionUiPositionId;
    linkUrl?: string;

    size?: ImageSizeVariant;
    width?: number | null;
    height?: number | null;
    ratio?: string | null;
    fit?: ImageObjectFit;
}

export interface OpenMarkdownImageModel {
    markdownImageId?: string | null;

    source?: SaveMarkdownImageModel["source"];
    markdownImage?: string;
    httpUrl?: string;
    altText?: MultiLangValue;
    alignment?: SaveMarkdownImageModel["alignment"];
    caption?: MultiLangValue;
    captionPosition?: SaveMarkdownImageModel["captionPosition"];
    linkUrl?: string;

    size?: ImageSizeVariant;
    width?: number | null;
    height?: number | null;
    ratio?: string | null;
    fit?: ImageObjectFit;
}

/** Server payload returned from /api/addons/markdown/image/data */
export interface LoadFormManageMarkdownImageModel {
    markdownImageId?: string;

    source?: SaveMarkdownImageModel["source"];
    markdownImage?: string;
    httpUrl?: string;
    altText?: MultiLangValue;
    alignment?: SaveMarkdownImageModel["alignment"];
    caption?: MultiLangValue;
    captionPosition?: SaveMarkdownImageModel["captionPosition"];
    linkUrl?: string;

    size?: ImageSizeVariant;
    width?: number | null;
    height?: number | null;
    ratio?: string | null;
    fit?: ImageObjectFit;

    markdownImageFile?: MediaFileViewModel;

    selectedSource?: SelectOptionModel | null;
    selectedCaptionPosition?: SelectOptionModel | null;
}

export interface ManageMarkdownImageFormLookupsModel {
    sources: PaginationModel;
    captionPositions: PaginationModel;
}

export type ResOfManageMarkdownImageFormData =
    FormDataResponseModel<ManageMarkdownImageFormLookupsModel, LoadFormManageMarkdownImageModel>;