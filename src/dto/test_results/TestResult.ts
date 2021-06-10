import {DtoObject} from '../DtoObject';
import {TestResultBuildAttributes} from './TestResultBuildAttributes';
import {TestResultTestField} from './TestResultTestField';
import {TestResultUnitTestRunElement} from './TestResultUnitTestRunElement';
import {TestResultGherkinTestRunElement} from "./TestResultGherkinTestRunElement";
import {TestResultTestRunElement} from "./TestResultTestRunElement";

export class TestResult extends DtoObject {
    build: any;
    test_fields: any;
    test_runs: any;

    constructor(build: TestResultBuildAttributes, test_fields: TestResultTestField[], test_runs: TestResultTestRunElement[]) {
        super();
        this.build = {'_attributes': build};
        this.test_fields = {'': test_fields};
        this.test_runs = {'': test_runs};
    }
}