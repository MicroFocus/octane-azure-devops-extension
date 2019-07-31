import {DtoObject} from "../DtoObject";
import {TestResultErrorAttributes} from "./TestResultErrorAttributes";

export class TestResultError extends DtoObject {
    error: any;

    constructor(error: TestResultErrorAttributes, StackTrace?: string) {
        super();
        this.error = {"_attributes": error, "_text": StackTrace};
    }
}
