import {DtoObject} from "../DtoObject";

export class GherkinStepErrorMessage extends DtoObject {
    _cdata: string;

    constructor(errorMessage: string) {
        super();
        this._cdata = errorMessage;
    }
}