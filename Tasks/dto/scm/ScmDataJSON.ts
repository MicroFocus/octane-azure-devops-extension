import { DtoJsonObject } from "../DtoJsonObject";
import { ScmCommit } from "./ScmCommit";

export interface ScmDataJSON extends DtoJsonObject {
    repository: string;
    builtRevId: number;
    commits: ScmCommit[]
}
