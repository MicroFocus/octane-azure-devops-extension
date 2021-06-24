import {TestResult} from './TestResult';

export class EmptyTestResult extends TestResult {
    constructor() {
        super(null, [], []);
    }
}