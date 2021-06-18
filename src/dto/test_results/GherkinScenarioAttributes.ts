import {DtoObject} from "../DtoObject";

export class GherkinScenarioAttributes extends DtoObject {
    name: string;
    status: string;

    constructor(name: string, status: string) {
        super();
        this.name = name;
        this.status = status;
    }
}