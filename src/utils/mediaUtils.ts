import type {MediaFileViewModel} from "../models/core/mediaModels";

export function mediaFileViewModelToStringList(mediaFileViewList: MediaFileViewModel[]): string[] {
    const result: string[] = [];
    mediaFileViewList?.forEach((mediaFileViewModel) => {
        result.push(mediaFileViewModel.id);
    });
    return result;
}
