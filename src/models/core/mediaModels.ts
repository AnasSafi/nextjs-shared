export interface MediaCoverModel {
    imageUrl?: string | null;
    alt?: string;
    width?: number;
    height?: number;
    mimeType?: string;
}

export interface MediaFileViewModel {
    id: string;
    url: string;
    originalUrl?: string | null;
    filename: string;
    fileExtension: string;
    mimeType: string;
    size: bigint;
    alt?: string;
    coverImage?: MediaCoverModel;
}
