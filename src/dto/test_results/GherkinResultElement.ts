import {DtoObject} from "../DtoObject";
import {GherkinResultAttributes} from "./GherkinResultAttributes";
import {TestResultElement} from "./TestResultElement";
import {GherkinResultData} from "./GherkinResultData";

export class GherkinResultElement extends TestResultElement {
    gherkin_test_run: GherkinResultData;

    constructor(gherkin_test_run: GherkinResultData) {
        super();
        this.gherkin_test_run = gherkin_test_run;
    }
}