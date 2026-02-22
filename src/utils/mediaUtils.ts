import type {MediaFileViewModel} from "../models/core/mediaModels";

export function mediaFileViewModelToStringList(mediaFileViewList: MediaFileViewModel[]): string[] {
    const result: string[] = [];
    mediaFileViewList?.forEach((mediaFileViewModel) => {
        result.push(mediaFileViewModel.id);
    });
    return result;
}

export type FileTypeCategory =
    | "image"
    | "video"
    | "audio"
    | "text"
    | "compressed"
    | "document"
    | "other";

/**
 * Convert a Blob to bytes (Uint8Array).
 * - Works in Node (Next.js runtime) and browsers.
 * - Consumer can convert to Buffer via Buffer.from(bytes) when needed.
 */
export const blobToUint8Array = async (blob: Blob): Promise<Uint8Array> => {
    const chunks: Uint8Array[] = [];
    const reader = blob.stream().getReader();

    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const out = new Uint8Array(total);

    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
    }

    return out;
};

export const getFileType = (mimeType: string): FileTypeCategory => {
    const mt = String(mimeType ?? "").toLowerCase().trim();

    if (mt.startsWith("image/")) return "image";
    if (mt.startsWith("video/")) return "video";
    if (mt.startsWith("audio/")) return "audio";
    if (mt.startsWith("text/")) return "text";

    if (
        [
            "application/gzip",
            "application/x-7z-compressed",
            "application/zip",
            "application/x-rar-compressed",
            "application/x-tar",
            "application/x-gzip",
            "application/x-bzip",
            "application/x-bzip2",
            "multipart/x-zip",
            "application/x-zip-compressed",
            "application/octet-stream",
            "application/vnd.rar",
        ].includes(mt)
    )
        return "compressed";

    if (
        [
            "application/pdf",
            "application/msword",
            "application/vnd.ms-excel",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.oasis.opendocument.text",
            "application/vnd.oasis.opendocument.spreadsheet",
            "application/vnd.oasis.opendocument.presentation",
            "application/rtf",
            "application/xml",
            "application/vnd.visio",
            "application/x-project",
            "application/postscript",
            "application/vnd.ms-word.document.macroEnabled.12",
            "application/vnd.ms-word.template.macroEnabled.12",
            "application/vnd.ms-excel.template.macroEnabled.12",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
            "application/vnd.ms-powerpoint.template.macroEnabled.12",
            "application/vnd.ms-powerpoint.addin.macroEnabled.12",
            "application/vnd.ms-powerpoint.slide.macroEnabled.12",
            "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
            "application/vnd.ms-powerpoint.slideshow.macroEnabled.12",
            "application/vnd.stardivision.calc",
            "application/vnd.stardivision.draw",
            "application/vnd.stardivision.writer",
            "application/vnd.stardivision.math",
            "application/vnd.stardivision.impress",
            "application/vnd.stardivision.chart",
            "application/vnd.wordperfect",
            "application/x-latex",
            "application/x-tex",
            "application/x-texinfo",
            "application/x-lzh-compressed",
            "application/x-font-ttf",
            "application/x-font-otf",
            "application/vnd.fdf",
            "application/vnd.adobe.xfdf",
            "application/vnd.pmi.widget",
            "application/vnd.lotus-wordpro",
            "application/x-wpwin",
            "application/x-dbase",
            "application/mac-binhex40",
            "application/epub+zip",
            "application/vnd.ms-access",
        ].includes(mt)
    )
        return "document";

    return "other";
};