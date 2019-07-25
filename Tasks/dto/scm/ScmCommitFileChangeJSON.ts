import { DtoJsonObject } from "../DtoJsonObject";

export interface ScmCommitFileChangeJSON extends DtoJsonObject {
    type: string;
    file: string;
}