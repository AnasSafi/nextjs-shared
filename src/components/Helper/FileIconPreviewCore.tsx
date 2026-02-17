"use client";

import Image from "next/image";
import React, {useEffect, useMemo, useState} from "react";
import {FileState} from "../../models/core/formModels";

export type FileIconPreviewCoreProps = {
    file: FileState;

    iconMap?: Record<string, string>;
    unknownIconUrl?: string;

    getIconUrl?: (mimeType: string) => string | null | undefined;

    width?: number;
    height?: number;

    className?: string;
    imageClassName?: string;
    iconClassName?: string;
};

export default function FileIconPreviewCore(
    {
        file,
        iconMap,
        unknownIconUrl,
        getIconUrl,
        width = 100,
        height = 100,
        className = "flex flex-col items-center p-1.5",
        imageClassName = "object-cover rounded-lg w-24 h-24 mb-3 shadow-lg",
        iconClassName = "object-cover rounded-lg w-24 h-24 mb-3 shadow-lg p-3",
    }: FileIconPreviewCoreProps,
) {
    const mimeType = file.file?.type ?? file.mediaFile?.mimeType ?? "unknown";
    const name = file.file?.name ?? file.mediaFile?.filename ?? "";

    const isLocalFile = Boolean(file.file);

    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file.file) {
            setObjectUrl(null);
            return;
        }

        const url = URL.createObjectURL(file.file);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file.file]);

    const url = isLocalFile ? objectUrl : (file.mediaFile?.url ?? null);

    const iconPath = useMemo(() => {
        const fromFn = getIconUrl?.(mimeType);
        if (fromFn) return fromFn;

        const fromMap = iconMap?.[mimeType];
        if (fromMap) return fromMap;

        return unknownIconUrl ?? null;
    }, [getIconUrl, iconMap, mimeType, unknownIconUrl]);

    if (!url) return null;

    return (
        <div className={className}>
            {mimeType.startsWith("image/") ? (
                <Image
                    width={width}
                    height={height}
                    src={url}
                    alt={name}
                    className={imageClassName}
                />
            ) : iconPath ? (
                <Image
                    width={width}
                    height={height}
                    src={iconPath}
                    alt={mimeType.split("/")[1]?.toUpperCase() ?? "FILE"}
                    className={iconClassName}
                />
            ) : null}
        </div>
    );
}
