import { DtoObject } from "../DtoObject";

export class TestResultErrorAttributes extends DtoObject {
    type: string = undefined;
    message: string;

    constructor( message: string, type?: string) {
        super();
        this.type = type;
        this.message = message;
    }
}




