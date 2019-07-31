import {DtoObject} from "../DtoObject";
import {TestRunResults} from "./TestResultEnums";

export class TestResultTestRunAttributes extends DtoObject {
    module: string;
    package: string;
    name: string;
    class: string;
    duration: number;
    status: TestRunResults;
    started: number;
    external_report_url: string;

    constructor(module: string, package_: string, name: string, class_: string, duration: number,
        status: TestRunResults, started: number, external_report_url: string) {
        super();
        this.module = module;
        this.package = package_;
        this.name = name;
        this.class = class_;
        this.duration = duration;
        this.status = status;
        this.started = started;
        this.external_report_url = external_report_url;
    }
}



