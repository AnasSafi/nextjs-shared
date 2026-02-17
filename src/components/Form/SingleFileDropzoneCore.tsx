"use client";

import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
    type JSX,
} from "react";
import type {FileState, RHFFieldError} from "../../models/core/formModels";
import type {MediaFileViewModel} from "../../models/core/mediaModels";
import {generateUniqueString} from "../../utils/stringUtils";
import {FormError} from "./Helpers/FormError";
import {RequiredAsterisk} from "./RequiredAsterisk";
import {TooltipIcon} from "./TooltipIcon";
import {TranslateFn} from "../../models/core/localeModels";

type UploadApiResponse = {
    success?: { data?: { mediaId?: string; publicUrl?: string } };
    data?: { mediaId?: string; publicUrl?: string };
    error?: { message?: string };
    message?: string;
};

type Variant = "compact" | "avatar";

export type SingleFileDropzoneCoreProps = {
    name: string;
    processKey: string;
    label?: string;
    id?: string;
    isRequired?: boolean;
    tipText?: string;
    error?: RHFFieldError | undefined;
    onChangeAction?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setParentInProgressAction?: Dispatch<SetStateAction<boolean>>;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
    initValue?: MediaFileViewModel | null;
    allowReplace?: boolean;
    variant?: Variant;
    disabled?: boolean;
    onUploadedAction?: (payload: { mediaId: string; publicUrl?: string | null }) => void;
    resetToken?: number | string;

    t: TranslateFn;

    getUserToken: () => Promise<string | null>;
    uploadUrl?: string;
};

function safeParseJSON<T>(text: string, fallback: T): T {
    try {
        return JSON.parse(text) as T;
    } catch {
        return fallback;
    }
}

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

type MaybeWithUrl = {
    absoluteUrl?: string;
    url?: string;
    publicUrl?: string;
    downloadUrl?: string;
};
type MaybeWithMime = { mimeType?: string; contentType?: string };

function mediaUrl(x: unknown): string | null {
    if (typeof x !== "object" || x === null) return null;
    const m = x as MaybeWithUrl;
    return m.absoluteUrl ?? m.url ?? m.publicUrl ?? m.downloadUrl ?? null;
}

function mediaMime(x: unknown): string | null {
    if (typeof x !== "object" || x === null) return null;
    const m = x as MaybeWithMime;
    return m.mimeType ?? m.contentType ?? null;
}

function isImageLike(mimeOrName?: string | null): boolean {
    if (!mimeOrName) return false;
    if (mimeOrName.startsWith("image/")) return true;
    const lower = (mimeOrName ?? "").toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((e) => lower.endsWith(e));
}

const SuccessBadge = ({text}: { text: string }) => (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 0 1 0 1.414l-7.25 7.25a1 1 0 0 1-1.414 0L3.293 9.207a1 1 0 1 1 1.414-1.414l3 3 6.543-6.543a1 1 0 0 1 1.457.043z"
                clipRule="evenodd"
            />
        </svg>
        {text}
    </span>
);

export default function SingleFileDropzoneCore(
    {
        name,
        processKey,
        label,
        id,
        isRequired,
        tipText,
        error,
        onChangeAction,
        setParentInProgressAction,
        allowedExtensions,
        allowedMimeTypes,
        initValue = null,
        allowReplace = true,
        variant = "compact",
        disabled = false,
        onUploadedAction,
        resetToken,

        t,
        getUserToken,
        uploadUrl = "/api/media/upload",
    }: SingleFileDropzoneCoreProps,
): JSX.Element {
    const tt = (key: string): string => (t ? t(key) : key);

    const inputId = id ?? `single-file-${name}`;
    const [fileState, setFileState] = useState<FileState | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [justUploaded, setJustUploaded] = useState(false);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (initValue) {
            const initial: FileState = {
                key: generateUniqueString(),
                mediaFile: initValue,
                uploadProgress: 100,
                uploadSuccess: true,
                mediaId: initValue.id,
            };
            setFileState(initial);
        } else {
            setFileState(null);
        }
    }, [initValue]);

    useEffect(() => {
        const mediaId = fileState?.mediaId ?? "";
        const syntheticEvent = {
            target: {name, type: "text", value: mediaId, checked: false},
        } as React.ChangeEvent<HTMLInputElement>;
        onChangeAction?.(syntheticEvent);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileState?.mediaId]);

    useEffect(() => {
        if (!fileState?.file || !fileState.file.type.startsWith("image/")) {
            setObjectUrl(null);
            return;
        }
        const url = URL.createObjectURL(fileState.file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [fileState?.file]);

    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (typeof resetToken === "undefined") return;
        setFileState(null);
        setObjectUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const syntheticEvent = {
            target: {name, type: "text", value: "", checked: false},
        } as React.ChangeEvent<HTMLInputElement>;
        onChangeAction?.(syntheticEvent);
    }, [resetToken, name, onChangeAction]);

    const previewUrl: string | null = useMemo(() => {
        if (objectUrl) return objectUrl;
        return mediaUrl(fileState?.mediaFile);
    }, [objectUrl, fileState?.mediaFile]);

    const previewIsImage = useMemo(() => {
        if (fileState?.file) return fileState.file.type.startsWith("image/");
        return isImageLike(mediaMime(fileState?.mediaFile) ?? previewUrl ?? "");
    }, [fileState?.file, fileState?.mediaFile, previewUrl]);

    const isUploading =
        !!fileState?.file && !fileState?.uploadSuccess && (fileState?.uploadProgress ?? 0) > 0;
    const isSuccess =
        !!fileState?.uploadSuccess && !fileState?.failedReason && (fileState?.uploadProgress ?? 0) >= 100;

    const acceptAttr = [...(allowedMimeTypes ?? []), ...((allowedExtensions ?? []).map((e) => `.${e}`))]
        .filter(Boolean)
        .join(",");

    const allowPick = (!fileState || allowReplace) && !disabled;

    function isFileExtensionAllowed(filename: string, exts?: string[]) {
        if (!exts || exts.length === 0) return true;
        const ext = filename.split(".").pop()?.toLowerCase();
        return exts.includes(ext ?? "");
    }

    function isFileMimeTypeAllowed(file: File, mimes?: string[]) {
        if (!mimes || mimes.length === 0) return true;
        return mimes.includes(file.type);
    }

    function pickFirstAllowed(files: File[]): File | null {
        for (const f of files) {
            if (isFileExtensionAllowed(f.name, allowedExtensions) && isFileMimeTypeAllowed(f, allowedMimeTypes)) {
                return f;
            }
        }
        return null;
    }

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(true);
    };
    const onDragLeave = () => {
        if (disabled) return;
        setDragOver(false);
    };
    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(false);
        if (!allowPick) return;
        const dropped = Array.from(e.dataTransfer.files);
        const file = pickFirstAllowed(dropped);
        if (!file) return;
        const newState: FileState = {key: generateUniqueString(), file, uploadProgress: 0};
        setJustUploaded(false);
        setFileState(newState);
        await uploadFile(newState);
    };

    const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!allowPick) return;
        const selected = Array.from(e.target.files ?? []);
        const file = pickFirstAllowed(selected);
        if (!file) return;
        const newState: FileState = {key: generateUniqueString(), file, uploadProgress: 0};
        setJustUploaded(false);
        setFileState(newState);
        await uploadFile(newState);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const openFilePicker = () => {
        if (!allowPick) return;
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };
    const handleReplace = openFilePicker;
    const handleRemove = () => {
        if (disabled) return;
        setFileState(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const syntheticEvent = {
            target: {name, type: "text", value: "", checked: false},
        } as React.ChangeEvent<HTMLInputElement>;
        onChangeAction?.(syntheticEvent);
    };

    async function uploadFile(state: FileState) {
        if (!state.file) return;

        const userToken: string | null = await getUserToken();
        const formData = new FormData();
        formData.append("file", state.file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl, true);
        xhr.setRequestHeader("ProcessKey", processKey);
        xhr.setRequestHeader("Authorization", userToken ?? "");

        xhr.upload.addEventListener("progress", (e) => {
            if (!e.lengthComputable) return;
            const progress = (e.loaded / e.total) * 100;
            setFileState((prev) =>
                prev && prev.key === state.key ? {...prev, uploadProgress: progress} : prev
            );
        });

        xhr.addEventListener("load", () => {
            setParentInProgressAction?.(false);
            const serverResponse: UploadApiResponse = safeParseJSON<UploadApiResponse>(xhr.responseText, {});
            if (xhr.status === 200) {
                const mediaId =
                    serverResponse.success?.data?.mediaId ?? serverResponse.data?.mediaId ?? "";
                const publicUrl =
                    serverResponse.success?.data?.publicUrl ?? serverResponse.data?.publicUrl ?? undefined;

                setFileState((prev) =>
                    prev && prev.key === state.key
                        ? {...prev, uploadSuccess: true, mediaId, uploadProgress: 100}
                        : prev
                );

                if (successTimerRef.current) clearTimeout(successTimerRef.current);
                setJustUploaded(true);
                successTimerRef.current = setTimeout(() => setJustUploaded(false), 1500);

                if (mediaId) {
                    onUploadedAction?.({mediaId, publicUrl: publicUrl ?? null});
                }
            } else {
                const failedReason =
                    serverResponse.error?.message ?? serverResponse.message ?? "Upload failed";
                setFileState((prev) =>
                    prev && prev.key === state.key ? {...prev, uploadSuccess: false, failedReason} : prev
                );
            }
        });

        xhr.addEventListener("error", () => {
            setParentInProgressAction?.(false);
            setFileState((prev) =>
                prev && prev.key === state.key ? {...prev, uploadSuccess: false} : prev
            );
        });

        setParentInProgressAction?.(true);
        xhr.send(formData);
    }

    const labelRow: JSX.Element = (
        <label
            htmlFor={inputId}
            className="mb-1 flex items-center justify-between text-sm font-medium text-gray-900 dark:text-gray-100"
        >
            <span className="inline-flex items-center gap-2">
                {label}
                {isRequired && <RequiredAsterisk t={t} />}
                {tipText && <TooltipIcon tipText={tipText} />}
            </span>
        </label>
    );

    const uploadBtnClasses = [
        "rounded-md border border-dashed border-gray-400 px-3 py-1.5 text-sm",
        "dark:border-gray-600",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-700",
    ].join(" ");

    const uploadButton = (
        <button
            type="button"
            onClick={openFilePicker}
            className={uploadBtnClasses}
            disabled={disabled || !allowPick}
            aria-disabled={disabled || !allowPick}
        >
            {tt("upload")}
        </button>
    );

    const progressBar: JSX.Element | null =
        isUploading || (fileState && (fileState?.uploadProgress ?? 0) < 100) ? (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                    className="h-full bg-gray-900 transition-all dark:bg-gray-100"
                    style={{width: `${Math.round(fileState?.uploadProgress ?? 0)}%`}}
                />
            </div>
        ) : null;

    const hiddenFileInput = (
        <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            onChange={onFilePicked}
            className="hidden"
            accept={acceptAttr}
            aria-hidden="true"
            tabIndex={-1}
            disabled={disabled}
        />
    );

    if (variant === "avatar") {
        const avatarAriaLabel = fileState ? tt("replace") : tt("upload");

        return (
            <div className={`w-full ${disabled ? "opacity-60" : ""}`} aria-disabled={disabled}>
                {label && labelRow}

                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={[
                        "relative flex items-start justify-between gap-6",
                        "ltr:flex-row rtl:flex-row-reverse",
                        disabled ? "pointer-events-none" : "",
                    ].join(" ")}
                >
                    <div className="min-w-0 flex-1 text-start">
                        {fileState?.file && (
                            <div className="truncate text-sm text-gray-800 dark:text-gray-100">
                                {fileState.file.name}
                                {fileState.file.size ? (
                                    <span className="opacity-70"> · {formatBytes(fileState.file.size)}</span>
                                ) : null}
                            </div>
                        )}

                        {fileState?.mediaFile && !fileState.file && (
                            <div className="text-sm text-gray-800 dark:text-gray-100">{tt("uploaded")}</div>
                        )}

                        {progressBar}

                        {fileState && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleReplace}
                                    className={[
                                        "rounded-md border border-gray-600 px-3 py-1.5 text-xs",
                                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5",
                                    ].join(" ")}
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                >
                                    {tt("replace")}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    className={[
                                        "rounded-md border border-gray-600/60 px-3 py-1.5 text-xs",
                                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5",
                                    ].join(" ")}
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                >
                                    {tt("remove")}
                                </button>
                            </div>
                        )}

                        {fileState?.failedReason && (
                            <div className="mt-2 text-xs text-red-500" aria-live="polite">
                                {fileState.failedReason}
                            </div>
                        )}
                    </div>

                    <div className="relative shrink-0">
                        <div
                            className={[
                                "group relative flex h-40 w-40 select-none items-center justify-center overflow-hidden rounded-full",
                                "bg-gradient-to-b from-slate-800/30 to-slate-900/60",
                                "shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_10px_30px_-10px_rgba(0,0,0,0.5)]",
                                dragOver ? "ring-2 ring-emerald-500/80 ring-offset-2 ring-offset-transparent" : "ring-1 ring-white/10",
                                justUploaded ? "outline-2 outline-emerald-500/70" : "",
                                disabled ? "cursor-not-allowed" : "cursor-pointer",
                            ].join(" ")}
                            onClick={disabled ? undefined : openFilePicker}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            aria-label={avatarAriaLabel}
                            aria-disabled={disabled}
                            onKeyDown={(e) => {
                                if (disabled) return;
                                if (e.key === "Enter" || e.key === " ") openFilePicker();
                            }}
                        >
                            {previewUrl && previewIsImage ? (
                                <img
                                    alt="preview"
                                    src={previewUrl}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    draggable={false}
                                />
                            ) : previewUrl ? (
                                <span className="px-2 text-center text-xs text-gray-200/90">{tt("uploaded")}</span>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-gray-300">
                                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" className="opacity-80">
                                        <path
                                            fill="currentColor"
                                            d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z"
                                        />
                                    </svg>
                                    <span className="mt-1 text-xs">{tt("clickToUpload")}</span>
                                </div>
                            )}

                            {isUploading && (
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 rounded-full [mask:radial-gradient(farthest-side,transparent_73%,black_74%)]"
                                    style={{
                                        background: `conic-gradient(#10b981 ${Math.round(fileState?.uploadProgress ?? 0)}%, transparent 0)`,
                                    }}
                                />
                            )}

                            <div
                                className={[
                                    "absolute inset-0 rounded-full bg-black/45 transition-opacity duration-150",
                                    disabled ? "opacity-0" : "opacity-0 group-hover:opacity-100",
                                ].join(" ")}
                            />

                            <button
                                type="button"
                                onClick={openFilePicker}
                                className={[
                                    "absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-2 py-1 text-xs text-white transition",
                                    disabled ? "opacity-50 cursor-not-allowed" : "group-hover:opacity-100",
                                ].join(" ")}
                                disabled={disabled || !allowPick}
                                aria-disabled={disabled || !allowPick}
                            >
                                {fileState ? tt("replace") : tt("upload")}
                            </button>

                            {isSuccess && (
                                <span className="absolute top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] text-white shadow-md">
                                    {tt("uploaded")}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {hiddenFileInput}
                <FormError error={error} />
            </div>
        );
    }

    return (
        <div className={`w-full ${disabled ? "opacity-60" : ""}`} aria-disabled={disabled}>
            {label && labelRow}

            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={[
                    "w-full max-w-xl rounded-lg border p-3",
                    "bg-gray-50 dark:bg-gray-800",
                    disabled ? "pointer-events-none" : "",
                    dragOver ? "border-gray-400 dark:border-gray-500" : "border-gray-300 dark:border-gray-700",
                ].join(" ")}
            >
                {!fileState && (
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-600 dark:text-gray-300">{tt("clickToUpload")}</div>
                        {uploadButton}
                    </div>
                )}

                {fileState && (
                    <div className="flex items-center gap-3">
                        {previewUrl && previewIsImage ? (
                            <img alt="preview" src={previewUrl} className="h-20 w-20 rounded-md object-cover" />
                        ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-md bg-gray-200 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {tt("uploaded")}
                            </div>
                        )}

                        <div className="min-w-0 flex-1 text-start">
                            <div className="truncate text-sm text-gray-800 dark:text-gray-100">
                                {fileState.file?.name ?? tt("uploaded")}
                            </div>
                            {fileState.file?.size ? (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatBytes(fileState.file.size)}
                                </div>
                            ) : null}
                            {progressBar}
                            {isSuccess && (
                                <div className="mt-1" aria-live="polite">
                                    <SuccessBadge text={tt("uploaded")} />
                                </div>
                            )}
                            {fileState.failedReason && (
                                <div className="mt-1 text-xs text-red-600 dark:text-red-400" aria-live="polite">
                                    {fileState.failedReason}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={handleReplace}
                                className={[
                                    "rounded-md border border-gray-300 px-2 py-1 text-xs",
                                    disabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700",
                                ].join(" ")}
                                disabled={disabled || !allowPick}
                                aria-disabled={disabled || !allowPick}
                            >
                                {tt("replace")}
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className={[
                                    "rounded-md border border-gray-300 px-2 py-1 text-xs",
                                    disabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700",
                                ].join(" ")}
                                disabled={disabled}
                                aria-disabled={disabled}
                            >
                                {tt("remove")}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {hiddenFileInput}
            <FormError error={error} />
        </div>
    );
}