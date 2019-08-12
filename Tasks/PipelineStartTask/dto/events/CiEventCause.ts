import { DtoObject } from "../DtoObject";

export class CiEventCause extends DtoObject {
    type: string;
    userName: string;
    userId: string;
    project: string;
    buildCiId: number;
    causes: any = [];

    constructor(type: string, user_name?: string, user_id?: string, project?: string, buildCiId?: number, causes?: any) {
        super();
        this.type = type;
        this.userName = user_name;
        this.userId = user_id;
        this.project = project;
        this.buildCiId = buildCiId;
        this.causes = causes;
    }
}