import {DtoObject} from "../DtoObject";
import {TestResultTestFieldAttributes} from "./TestResultTestFieldAttributes";

export class GherkinTestResultData extends DtoObject {
    feature: any;

    constructor(testData: any) {
        super();
        this.feature = testData;
    }
}