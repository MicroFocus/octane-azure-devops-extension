import { DtoJsonObject } from "../DtoJsonObject";

export interface CiEventCauseJSON extends DtoJsonObject {
    type: string;
    userName: string;
    userId: string;
    project: string;
    buildCiId: number;
    causes: any;
}

