import {DtoObject} from "../DtoObject";
import {GherkinStepAttributes} from "./GherkinStepAttributes";
import {GherkinStepErrorMessage} from "./GherkinStepErrorMessage";

export class GherkinStepData extends DtoObject {
    _attributes: GherkinStepAttributes;
    error_message: GherkinStepErrorMessage;

    constructor(attributes: GherkinStepAttributes, error_message: GherkinStepErrorMessage) {
        super();
        this._attributes = attributes;
        this.error_message = error_message;
    }
}