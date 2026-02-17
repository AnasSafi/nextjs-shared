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

    const uploadFile = async (fileState: FileState, index: number) => {
        if (!fileState.file) return;

        const token = await getUserToken();

        const formData = new FormData();
        formData.append("file", fileState.file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/media/upload", true);
        xhr.setRequestHeader("ProcessKey", processKey);
        xhr.setRequestHeader("Authorization", token ?? "");

        xhr.upload.addEventListener("progress", e => {
            if (e.lengthComputable) {
                const progress = (e.loaded / e.total) * 100;
                setFiles(prev => {
                    const copy = [...prev];
                    copy[index].uploadProgress = progress;
                    return copy;
                });
            }
        });

        xhr.addEventListener("load", () => {
            setParentInProgress?.(false);

            const res = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                setFiles(prev => {
                    const copy = [...prev];
                    copy[index].uploadSuccess = true;
                    copy[index].mediaId = res.success.data.mediaId;
                    return copy;
                });
            } else {
                setFiles(prev => {
                    const copy = [...prev];
                    copy[index].uploadSuccess = false;
                    copy[index].failedReason = res?.error?.message;
                    return copy;
                });
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

            for (const [i, fs] of newStates.entries()) {
                await uploadFile(fs, files.length + i);
            }
        }
    };

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

            <div className="flex flex-col items-center">
                <label
                    htmlFor={id}
                    className="flex flex-col items-center justify-between w-full h-fit p-4 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700"
                >
                    {files.length === 0 && (
                        <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                            {t("dropFilesHere")}
                        </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                        {files.map((fileState, index) => (
                            <div key={index}>
                                <FileIconPreview file={fileState}/>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFile(fileState)}
                                    className="text-red-500 text-xs mt-1"
                                >
                                    {t("remove")}
                                </button>
                            </div>
                        ))}
                    </div>

                    <input
                        id={id}
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </label>

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