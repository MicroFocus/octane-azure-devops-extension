import { DtoJsonObject } from "../DtoJsonObject";
import { ScmCommitFileChange } from "./ScmCommitFileChange";

export interface ScmCommitJSON extends DtoJsonObject {
    time: number;
    user: string;
    revId: string;
    changes: ScmCommitFileChange[];
    userEmail: string;
    parentRevId: string;
    comment: string;
}