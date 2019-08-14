import {DtoObject} from '../DtoObject';

export class TestResultTestFieldAttributes extends DtoObject {
    type: any;
    value: any;

    constructor(type: string, value: string) {
        super();
        this.type = type;
        this.value = value;
    }
}

