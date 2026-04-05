"use client";

import React, {
    useState,
    useRef,
    useEffect,
    type Dispatch,
    type SetStateAction,
    type JSX,
} from "react";
import type {MediaFileViewModel} from "../../models/core/mediaModels";
import type {FileState, RHFFieldError} from "../../models/core/formModels";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {FormError} from "./Helpers/FormError";
import {generateUniqueString} from "../../utils/stringUtils";
import {TranslateFn} from "../../models/core/localeModels";

type Injected = {
    t: TranslateFn;
    getUserToken: () => Promise<string | null>;
    FileIconPreview: React.ComponentType<{ file: FileState }>;
};

export interface FileDropzoneCoreProps extends Injected {
    name: string;
    processKey: string;
    label?: string;
    id?: string;
    isRequired?: boolean;
    tipText?: string;
    minFiles?: number;
    maxFiles?: number;
    error?: RHFFieldError | undefined;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setParentInProgress?: Dispatch<SetStateAction<boolean>>;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    initValue?: MediaFileViewModel[];
}

export default function FileDropzoneCore(
    {
        t,
        getUserToken,
        FileIconPreview,

        name,
        processKey,
        label,
        id,
        isRequired,
        tipText,
        minFiles = 1,
        maxFiles = 10,
        error,
        onChange,
        setParentInProgress,
        allowedExtensions,
        allowedMimeTypes,
        initValue,
    }: FileDropzoneCoreProps): JSX.Element {

    const [files, setFiles] = useState<FileState[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputId = id ?? name;

    useEffect(() => {
        if (initValue) {
            const initialFileState = initValue.map(mediaFile => ({
                key: generateUniqueString(),
                mediaFile,
                uploadProgress: 100,
                uploadSuccess: true,
                mediaId: mediaFile.id,
            } as FileState));
            setFiles(initialFileState);
        }
    }, [initValue]);

    useEffect(() => {
        const mediaIdList = files.map(fileState => fileState.mediaId) ?? [];
        const json = JSON.stringify(mediaIdList);
        const syntheticEvent = {
            target: {name, type: "text", value: json, checked: false},
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
    }, [files, name, onChange]);

    const isFileExtensionAllowed = (filename: string) => {
        if (!allowedExtensions) return true;
        const ext = filename.split(".").pop()?.toLowerCase();
        return allowedExtensions.includes(ext ?? "");
    };

    const isFileMimeTypeAllowed = (file: File) => {
        if (!allowedMimeTypes) return true;
        return allowedMimeTypes.includes(file.type);
    };

    const handleRemoveFile = (fileToRemove: FileState) => {
        setFiles(prev => prev.filter(f => f.key !== fileToRemove.key));
    };

    const uploadFile = async (fileState: FileState) => {
        if (!fileState.file) return;

        const token = await getUserToken();
        const fileKey = fileState.key;

        const formData = new FormData();
        formData.append("file", fileState.file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/media/upload", true);
        xhr.setRequestHeader("ProcessKey", processKey);
        xhr.setRequestHeader("Authorization", token ?? "");

        xhr.upload.addEventListener("progress", e => {
            if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                setFiles(prev =>
                    prev.map(file =>
                        file.key === fileKey ? {...file, uploadProgress: progress} : file,
                    ),
                );
            }
        });

        xhr.addEventListener("load", () => {
            setParentInProgress?.(false);

            const res = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                setFiles(prev =>
                    prev.map(file =>
                        file.key === fileKey
                            ? {...file, uploadSuccess: true, mediaId: res.success.data.mediaId}
                            : file,
                    ),
                );
            } else {
                setFiles(prev =>
                    prev.map(file =>
                        file.key === fileKey
                            ? {...file, uploadSuccess: false, failedReason: res?.error?.message}
                            : file,
                    ),
                );
            }
        });

        xhr.addEventListener("error", () => {
            setParentInProgress?.(false);
        });

        setParentInProgress?.(true);
        xhr.send(formData);
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let selected = Array.from(e.target.files ?? []);

        selected = selected.filter(f =>
            isFileExtensionAllowed(f.name) &&
            isFileMimeTypeAllowed(f)
        );

        if (files.length + selected.length <= maxFiles) {
            const newStates = selected.map(file => ({
                key: generateUniqueString(),
                file,
                uploadProgress: 0,
            }));
            setFiles(prev => [...prev, ...newStates]);

            for (const fs of newStates) {
                await uploadFile(fs);
            }
        }

        e.target.value = "";
    };

    const formatFileSize = (size: number | bigint | undefined): string | null => {
        if (size === undefined) return null;

        const normalizedSize = typeof size === "bigint" ? Number(size) : size;
        if (!Number.isFinite(normalizedSize) || normalizedSize < 0) return null;

        if (normalizedSize < 1024) return `${normalizedSize} B`;

        const units = ["KB", "MB", "GB", "TB"];
        let value = normalizedSize / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    };

    const buildAcceptAttr = (): string | undefined => {
        const mimeTypes = allowedMimeTypes ?? [];
        const extensions = (allowedExtensions ?? []).map((ext) =>
            ext.startsWith(".") ? ext : `.${ext}`,
        );
        const accept = [...mimeTypes, ...extensions].join(",");
        return accept.length > 0 ? accept : undefined;
    };

    const acceptAttr = buildAcceptAttr();

    return (
        <>
            {label && (
                <label className="mb-2 text-sm font-medium text-gray-900 dark:text-white flex justify-between">
                    <div>
                        {label}
                        {isRequired && <RequiredAsterisk t={t}/>}
                        {tipText && <TooltipIcon tipText={tipText}/>}
                    </div>
                </label>
            )}

            <div className="flex flex-col w-full">
                <div className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
                    <label
                        htmlFor={inputId}
                        className="flex cursor-pointer flex-col items-center rounded-lg border border-transparent px-4 py-5 text-center transition-colors hover:bg-white/60 dark:hover:bg-gray-800/40"
                    >
                        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
                            {t("dropFilesHere")}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {files.length}/{maxFiles}
                        </p>
                    </label>

                    <input
                        id={inputId}
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileInput}
                        className="hidden"
                        accept={acceptAttr}
                    />
                </div>

                {files.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {files.map((fileState) => {
                            const fileName = fileState.file?.name ?? fileState.mediaFile?.filename ?? "—";
                            const fileSize = formatFileSize(fileState.file?.size ?? fileState.mediaFile?.size);
                            const progress = Math.round(fileState.uploadProgress ?? 0);
                            const showProgress = progress < 100 && fileState.uploadSuccess !== false;

                            return (
                                <div
                                    key={fileState.key}
                                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-xs transition-colors hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-md bg-gray-100 p-1 dark:bg-gray-700">
                                            <FileIconPreview file={fileState}/>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                {fileName}
                                            </p>
                                            {fileSize && (
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {fileSize}
                                                </p>
                                            )}

                                            {showProgress && (
                                                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all dark:bg-blue-500"
                                                        style={{width: `${progress}%`}}
                                                    />
                                                </div>
                                            )}

                                            {fileState.failedReason && (
                                                <p className="mt-2 line-clamp-2 text-xs text-red-600 dark:text-red-400">
                                                    {fileState.failedReason}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(fileState)}
                                            className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                        >
                                            {t("remove")}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {files.length < minFiles && (
                    <p className="mt-2 text-red-500 text-xs">
                        {t("pleaseUploadAtLeastMessage", {minFiles})}
                    </p>
                )}

                {files.length > maxFiles && (
                    <p className="mt-2 text-red-500 text-xs">
                        {t("youCanUploadAtMostMessage", {maxFiles})}
                    </p>
                )}
            </div>

            <FormError error={error}/>
        </>
    );
}
