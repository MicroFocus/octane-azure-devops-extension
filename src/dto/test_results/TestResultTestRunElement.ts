import {DtoObject} from '../DtoObject';
import {TestResultTestRunAttributes} from './TestResultTestRunAttributes';
import {TestResultError} from './TestResultError';

export class TestResultTestRunElement extends DtoObject {
    test_run: any;

    constructor(test_run: TestResultTestRunAttributes, error?: TestResultError) {
        super();
        this.test_run = error ? [{'': error, '_attributes': test_run}] : {'_attributes': test_run};
    }
}