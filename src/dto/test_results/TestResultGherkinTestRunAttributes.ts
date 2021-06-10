import {DtoObject} from "../DtoObject";
import {TestRunResults} from "./TestResultEnums";

export class TestResultGherkinTestRunAttributes extends DtoObject {
    name: string;
    duration: number;
    status: TestRunResults;

    constructor(name: string, duration: number, status: TestRunResults) {
        super();
        this.name = name;
        this.duration = duration;
        this.status = status;
    }
}
