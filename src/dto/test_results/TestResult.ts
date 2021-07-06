import {DtoObject} from '../DtoObject';
import {TestResultBuildAttributes} from './TestResultBuildAttributes';
import {TestResultTestField} from './TestResultTestField';
import {TestResultElement} from "./TestResultElement";

export class TestResult extends DtoObject {
    build: any;
    test_fields: any;
    test_runs: any;

    constructor(build: TestResultBuildAttributes, test_fields: TestResultTestField[], test_runs: TestResultElement[]) {
        super();
        this.build = {'_attributes': build};
        this.test_fields = {'': test_fields};
        this.test_runs = {'': test_runs};
    }
}