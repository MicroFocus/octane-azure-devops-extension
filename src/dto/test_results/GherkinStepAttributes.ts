import {DtoObject} from '../DtoObject';

export class GherkinStepAttributes extends DtoObject {
    duration: number;
    name: string;
    status: string;

    constructor(duration: number, name: string, status: string) {
        super();
        this.duration = duration;
        this.name = name;
        this.status = status;
    }
}