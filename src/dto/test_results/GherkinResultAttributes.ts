import {DtoObject} from "../DtoObject";
import {TestRunStatus} from "./TestResultEnums";

export class GherkinResultAttributes extends DtoObject {
    name: string;
    duration: number;
    status: TestRunStatus;

    constructor(name: string, duration: number, status: TestRunStatus) {
        super();
        this.name = name;
        this.duration = duration;
        this.status = status;
    }
}
