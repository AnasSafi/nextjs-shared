"use client";

import type {JSX, ReactNode} from "react";
import {
    ArchiveBoxIcon,
    ArrowDownTrayIcon,
    ArrowTopRightOnSquareIcon,
    DocumentIcon,
    DocumentTextIcon,
    FilmIcon,
    MusicalNoteIcon,
    PhotoIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import type {MediaFileViewModel} from "../../models/core/mediaModels";

export type AttachmentsListViewMode = "grid" | "list" | "compact" | "masonry";

export type AttachmentKind =
    | "image"
    | "video"
    | "audio"
    | "pdf"
    | "document"
    | "archive"
    | "other";

export interface AttachmentsListGridProps {
    attachments: MediaFileViewModel[];
    viewMode?: AttachmentsListViewMode;
    className?: string;
    itemClassName?: string;
    allowOpenInNewTab?: boolean;
    allowDownload?: boolean;
    onAttachmentClick?: (attachment: MediaFileViewModel) => void;
    renderActions?: (attachment: MediaFileViewModel) => ReactNode;
    downloadUrlResolver?: (attachment: MediaFileViewModel) => string;
    emptyTitle?: string;
    emptyDescription?: string;
    labels?: {
        open?: string;
        download?: string;
    };
}

const DOCUMENT_EXTENSIONS = new Set([
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "csv",
    "txt",
    "rtf",
]);

const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);

const BADGE_STYLES: Record<AttachmentKind, string> = {
    image: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    video: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
    audio: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
    pdf: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200",
    document: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    archive: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200",
    other: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

const KIND_LABELS: Record<AttachmentKind, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    pdf: "PDF",
    document: "Document",
    archive: "Archive",
    other: "File",
};

const getExtension = (attachment: MediaFileViewModel): string => {
    const raw =
        attachment.fileExtension ||
        attachment.filename?.split(".").pop() ||
        "";

    return raw.replace(/^\./, "").toLowerCase();
};

const getAttachmentKind = (attachment: MediaFileViewModel, extension: string): AttachmentKind => {
    const mime = attachment.mimeType?.toLowerCase() ?? "";

    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/") || mime === "application/x-mpegurl") return "video";
    if (mime.startsWith("audio/")) return "audio";
    if (mime === "application/pdf" || extension === "pdf") return "pdf";
    if (
        mime.startsWith("text/") ||
        mime.includes("spreadsheet") ||
        mime.includes("wordprocessingml") ||
        mime.includes("presentationml") ||
        DOCUMENT_EXTENSIONS.has(extension)
    ) {
        return "document";
    }
    if (
        mime.includes("zip") ||
        mime.includes("compressed") ||
        mime.includes("tar") ||
        ARCHIVE_EXTENSIONS.has(extension)
    ) {
        return "archive";
    }

    return "other";
};

const formatFileSize = (size: bigint | undefined): string | null => {
    if (size === undefined || size < 0n) return null;

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024n && unitIndex < units.length - 1) {
        value /= 1024n;
        unitIndex += 1;
    }

    return `${value.toString()} ${units[unitIndex]}`;
};

const PreviewIcon = ({kind}: {kind: AttachmentKind}): JSX.Element => {
    const iconClassName = "h-10 w-10 text-gray-500 dark:text-gray-300";

    switch (kind) {
        case "image":
            return <PhotoIcon className={iconClassName} />;
        case "video":
            return <FilmIcon className={iconClassName} />;
        case "audio":
            return <MusicalNoteIcon className={iconClassName} />;
        case "pdf":
            return <DocumentTextIcon className={iconClassName} />;
        case "document":
            return <DocumentIcon className={iconClassName} />;
        case "archive":
            return <ArchiveBoxIcon className={iconClassName} />;
        default:
            return <DocumentIcon className={iconClassName} />;
    }
};

const AttachmentPreview = (
    {
        attachment,
        kind,
        extension,
        compact,
    }: {
        attachment: MediaFileViewModel;
        kind: AttachmentKind;
        extension: string;
        compact?: boolean;
    },
): JSX.Element => {
    const previewClassName = clsx(
        "relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800",
        compact ? "h-14 w-14 shrink-0" : "h-40 w-full",
    );

    if (kind === "image") {
        return (
            <div className={previewClassName}>
                <img
                    src={attachment.coverImage?.imageUrl ?? attachment.url}
                    alt={attachment.alt ?? attachment.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    if (kind === "video") {
        return (
            <div className={previewClassName}>
                <video
                    src={attachment.url}
                    poster={attachment.coverImage?.imageUrl ?? undefined}
                    preload="metadata"
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <FilmIcon className="h-8 w-8 text-white" />
                </div>
            </div>
        );
    }

    return (
        <div className={clsx(previewClassName, "flex items-center justify-center")}>
            <PreviewIcon kind={kind} />
            {extension && (
                <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {extension.toUpperCase()}
                </span>
            )}
        </div>
    );
};

const AttachmentOpenAction = (
    {
        attachment,
        label,
        onAttachmentClick,
    }: {
        attachment: MediaFileViewModel;
        label: string;
        onAttachmentClick?: (attachment: MediaFileViewModel) => void;
    },
): JSX.Element => {
    if (onAttachmentClick) {
        return (
            <button
                type="button"
                onClick={() => onAttachmentClick(attachment)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {label}
            </button>
        );
    }

    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            {label}
        </a>
    );
};

const AttachmentCard = (
    {
        attachment,
        itemClassName,
        layout,
        allowOpenInNewTab,
        allowDownload,
        onAttachmentClick,
        renderActions,
        downloadUrlResolver,
        labels,
    }: {
        attachment: MediaFileViewModel;
        itemClassName?: string;
        layout: AttachmentsListViewMode;
        allowOpenInNewTab: boolean;
        allowDownload: boolean;
        onAttachmentClick?: (attachment: MediaFileViewModel) => void;
        renderActions?: (attachment: MediaFileViewModel) => ReactNode;
        downloadUrlResolver?: (attachment: MediaFileViewModel) => string;
        labels: {open: string; download: string};
    },
): JSX.Element => {
    const extension = getExtension(attachment);
    const kind = getAttachmentKind(attachment, extension);
    const fileSizeText = formatFileSize(attachment.size);
    const kindLabel = KIND_LABELS[kind];
    const isCompact = layout === "compact";
    const isList = layout === "list";
    const shouldShowOpenAction = allowOpenInNewTab || Boolean(onAttachmentClick);

    const downloadHref = downloadUrlResolver?.(attachment) || attachment.originalUrl || attachment.url;
    const previewContent = (
        <AttachmentPreview
            attachment={attachment}
            kind={kind}
            extension={extension}
            compact={isCompact}
        />
    );

    const previewElement = onAttachmentClick ? (
        <button
            type="button"
            onClick={() => onAttachmentClick(attachment)}
            className="w-full text-start"
        >
            {previewContent}
        </button>
    ) : allowOpenInNewTab ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
            {previewContent}
        </a>
    ) : (
        previewContent
    );

    return (
        <article
            className={clsx(
                "group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900",
                isList && "flex items-center gap-3 p-3 hover:translate-y-0",
                isCompact && "flex items-center gap-3 p-2.5 hover:translate-y-0",
                !isList && !isCompact && "p-3",
                itemClassName,
            )}
        >
            <div className={clsx(isList || isCompact ? "w-auto" : "w-full")}>
                {previewElement}
            </div>

            <div className={clsx("min-w-0", isCompact ? "flex-1" : "mt-3")}>
                <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {attachment.filename}
                    </h4>
                    <span
                        className={clsx(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            BADGE_STYLES[kind],
                        )}
                    >
                        {kindLabel}
                    </span>
                </div>

                <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                    {attachment.mimeType}
                    {fileSizeText ? ` · ${fileSizeText}` : ""}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {shouldShowOpenAction && (
                        <AttachmentOpenAction
                            attachment={attachment}
                            label={labels.open}
                            onAttachmentClick={onAttachmentClick}
                        />
                    )}

                    {allowDownload && (
                        <a
                            href={downloadHref}
                            download
                            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            {labels.download}
                        </a>
                    )}

                    {renderActions?.(attachment)}
                </div>
            </div>
        </article>
    );
};

export default function AttachmentsListGrid(
    {
        attachments,
        viewMode = "grid",
        className,
        itemClassName,
        allowOpenInNewTab = true,
        allowDownload = true,
        onAttachmentClick,
        renderActions,
        downloadUrlResolver,
        emptyTitle = "No attachments yet",
        emptyDescription = "Upload files to start building a complete media gallery.",
        labels = {},
    }: AttachmentsListGridProps,
): JSX.Element {
    const resolvedLabels = {
        open: labels.open ?? "Open",
        download: labels.download ?? "Download",
    };

    if (!attachments || attachments.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/60">
                <DocumentIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{emptyTitle}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{emptyDescription}</p>
            </div>
        );
    }

    if (viewMode === "masonry") {
        return (
            <div className={clsx("columns-1 gap-4 sm:columns-2 xl:columns-3", className)}>
                {attachments.map((attachment) => (
                    <div key={attachment.id} className="mb-4 break-inside-avoid">
                        <AttachmentCard
                            attachment={attachment}
                            itemClassName={itemClassName}
                            layout={viewMode}
                            allowOpenInNewTab={allowOpenInNewTab}
                            allowDownload={allowDownload}
                            onAttachmentClick={onAttachmentClick}
                            renderActions={renderActions}
                            downloadUrlResolver={downloadUrlResolver}
                            labels={resolvedLabels}
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className={clsx(
                viewMode === "grid" && "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
                viewMode === "list" && "flex flex-col gap-3",
                viewMode === "compact" && "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
                className,
            )}
        >
            {attachments.map((attachment) => (
                <AttachmentCard
                    key={attachment.id}
                    attachment={attachment}
                    itemClassName={itemClassName}
                    layout={viewMode}
                    allowOpenInNewTab={allowOpenInNewTab}
                    allowDownload={allowDownload}
                    onAttachmentClick={onAttachmentClick}
                    renderActions={renderActions}
                    downloadUrlResolver={downloadUrlResolver}
                    labels={resolvedLabels}
                />
            ))}
        </div>
    );
}
