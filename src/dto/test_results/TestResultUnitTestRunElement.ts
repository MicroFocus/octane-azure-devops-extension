import {DtoObject} from '../DtoObject';
import {TestResultUnitTestRunAttributes} from './TestResultUnitTestRunAttributes';
import {TestResultError} from './TestResultError';
import {TestResultTestRunElement} from "./TestResultTestRunElement";

export class TestResultUnitTestRunElement extends TestResultTestRunElement {
    test_run: any;

    constructor(test_run: TestResultUnitTestRunAttributes, error?: TestResultError) {
        super();
        this.test_run = error ? [{'': error, '_attributes': test_run}] : {'_attributes': test_run};
    }
}