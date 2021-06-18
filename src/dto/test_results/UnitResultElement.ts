import {UnitResultAttributes} from './UnitResultAttributes';
import {TestResultError} from './TestResultError';
import {TestResultElement} from "./TestResultElement";

export class UnitResultElement extends TestResultElement {
    test_run: any;

    constructor(test_run: UnitResultAttributes, error?: TestResultError) {
        super();
        this.test_run = error ? [{'': error, '_attributes': test_run}] : {'_attributes': test_run};
    }
}