import {DtoObject} from "../DtoObject";
import {TestResultGherkinTestRunAttributes} from "./TestResultGherkinTestRunAttributes";
import {TestResultTestRunElement} from "./TestResultTestRunElement";

export class TestResultGherkinTestRunElement extends TestResultTestRunElement {
    gherkin_test_run: any;

    constructor(test_run: TestResultGherkinTestRunAttributes, testResultData: any) {
        super();
        this.gherkin_test_run = [{'': testResultData, '_attributes': test_run}];
    }
}