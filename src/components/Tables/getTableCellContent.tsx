import React, {type JSX} from "react";
import type {CellConfig, Column} from "../../models/ui/tableModels";
import FormattedDate from "../Helper/FormattedDate";
import type {MediaFileViewModel} from "../../models/core/mediaModels";
import {getStringFromAny} from "../../utils/tableFormatUtils";
import {ZoomableImage} from "./ZoomableImage";
import {VideoModalTrigger} from "../media/VideoModalTrigger";

const isHeic = (mime: string, ext?: string) =>
    mime === "image/heic" ||
    mime === "image/heif" ||
    ext?.toLowerCase() === "heic" ||
    ext?.toLowerCase() === "heif";

export type TableCellLinkRenderer = (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
    target?: string;
    download?: boolean;
}) => JSX.Element;

export type TableCellImageRenderer = (props: {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
}) => JSX.Element;

export type TableCellContentRenderers = {
    Link: TableCellLinkRenderer;
    Image: TableCellImageRenderer;
};

export function getTableCellContent<T>(
    {
        col,
        row,
        currentLng,
        renderers,
    }: {
        col: Column<T>;
        row: T;
        currentLng: string;
        renderers: TableCellContentRenderers;
    }): JSX.Element {

    const fieldValue: T[keyof T] = row[col.field];
    const cellCfg: CellConfig | undefined = col.cell;

    const produceContent: () => string | JSX.Element = (): string | JSX.Element => {
        if (!cellCfg) {
            return getStringFromAny(fieldValue, currentLng);
        }

        switch (cellCfg.kind) {
            case "media": {
                const media = fieldValue as MediaFileViewModel | null;
                if (!media) return getStringFromAny(fieldValue, currentLng);

                const {
                    mimeType,
                    url,
                    coverImage,
                    filename,
                    fileExtension,
                    alt,
                } = media;

                const {
                    rounded = false,
                    showPlayOverlay = true,
                    openInModal = true,
                    preferCoverImage = true,
                    forceImageCover = false,
                    fixedSize,
                } = cellCfg;

                const isVideo: boolean =
                    !forceImageCover && (mimeType.startsWith("video/") || mimeType === "application/x-mpegURL");
                const isImage: boolean = mimeType.startsWith("image/");
                const unsupportedHeic = isHeic(mimeType, fileExtension);

                const coverUrl: string | null =
                    (preferCoverImage && coverImage?.imageUrl) ||
                    (isImage ? url : null);

                const sizeClass: string = fixedSize
                    ? `w-[${fixedSize.width}px] h-[${fixedSize.height}px]`
                    : "w-[100px] h-[100px]";

                const roundedClass: string = rounded ? "rounded-full" : "rounded";

                if (coverUrl) {
                    return (
                        <div className="flex justify-center">
                            <div className={`relative ${sizeClass} ${roundedClass} overflow-hidden group cursor-pointer`}>
                                {isImage && openInModal ? (
                                    <ZoomableImage
                                        mediaFile={media}
                                        isRounded={rounded}
                                    />
                                ) : (
                                    <renderers.Image
                                        src={coverUrl}
                                        alt={coverImage?.alt || alt || filename}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                        width={fixedSize?.width || 100}
                                        height={fixedSize?.height || 100}
                                    />
                                )}

                                {isVideo && showPlayOverlay && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <svg
                                            className="w-8 h-8 text-white"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                )}

                                {isVideo && openInModal && (
                                    <VideoModalTrigger videoUrl={url} mimeType={mimeType} />
                                )}
                            </div>
                        </div>
                    );
                }

                if (unsupportedHeic) {
                    return (
                        <renderers.Link
                            href={url}
                            target="_blank"
                            download={true}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-700/30 dark:text-blue-200"
                        >
                            HEIC
                        </renderers.Link>
                    );
                }

                if (isVideo) {
                    return (
                        <renderers.Link
                            href={url}
                            target="_blank"
                            className="text-blue-500 underline"
                        >
                            {filename}
                        </renderers.Link>
                    );
                }

                return (
                    <renderers.Link
                        href={url}
                        target="_blank"
                        download={true}
                        className="bg-blue-200 dark:bg-blue-800 p-3 rounded-md"
                    >
                        {fileExtension?.toUpperCase() || "File"}
                    </renderers.Link>
                );
            }

            case "number":
                return getStringFromAny(fieldValue, currentLng, cellCfg.decimals);

            case "date":
                if (typeof fieldValue === "string" || fieldValue instanceof Date) {
                    return <FormattedDate date={fieldValue} locale={currentLng} format={"date"} />;
                }
                break;

            case "dateTime":
                if (typeof fieldValue === "string" || fieldValue instanceof Date) {
                    return <FormattedDate date={fieldValue} locale={currentLng} className="text-sm" format={"datetime"} />;
                }
                break;

            default:
                break;
        }

        return getStringFromAny(fieldValue, currentLng);
    };

    const content: string | JSX.Element = produceContent();

    return col.alwaysLTR ? <div dir="ltr">{content}</div> : <span>{content}</span>;
}
