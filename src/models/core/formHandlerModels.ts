import type {Dispatch, SetStateAction} from "react";
import type {FieldValues} from "react-hook-form";
import type {ObjectSchema} from "yup";
import type {ServerSuccessModel} from "./formModels";

export interface UseFormHandlerProps<TValues extends FieldValues, TSuccess> {
    keepInProgressOnSuccess?: boolean;
    setInProgress: Dispatch<SetStateAction<boolean>>;
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    validationSchema: ObjectSchema<TValues>;
    onSuccess?: (data: ServerSuccessModel<TSuccess>) => void | Promise<void>;
    onError?: (err: unknown) => void | Promise<void>;
    bodyData: TValues;
}
