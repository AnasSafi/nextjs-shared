import type {ServerErrorModel} from "../models/core/formModels";

export class FetchError extends Error {
    serverError?: ServerErrorModel;

    constructor(message: string, serverError?: ServerErrorModel) {
        super(message);
        this.serverError = serverError;
        Object.setPrototypeOf(this, FetchError.prototype);
    }
}
