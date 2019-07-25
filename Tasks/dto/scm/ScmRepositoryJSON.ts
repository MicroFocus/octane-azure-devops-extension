import { DtoJsonObject } from "../DtoJsonObject";

export interface ScmRepositoryJSON extends DtoJsonObject {
     type: string;
     url: string;
     branch: string;
}