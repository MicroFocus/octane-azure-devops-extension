import { DtoObject } from "../DtoObject";

export class ScmCommitFileChange  extends  DtoObject{
    type: string;
    file: string ;

    constructor(type: string, file: string) {
        super()
        this.type = type;
        this.file = file;
    }
}