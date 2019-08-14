import {DtoObject} from '../DtoObject';
import {TestResultTestFieldAttributes} from './TestResultTestFieldAttributes';

export class TestResultTestField extends DtoObject {
    test_field: any;

    constructor(testfield: TestResultTestFieldAttributes) {
        super();
        this.test_field = {'_attributes': testfield};
    }
}
