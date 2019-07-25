
import { ScmCommit } from "./ScmCommit";
import { DtoObject } from "../DtoObject";

export class ScmData extends DtoObject {
    repository: string;
    builtRevId: number;
    commits: ScmCommit[] = [];

    constructor(repository: string, built_rev_id: number, commits: ScmCommit[]) {
        super();
        this.repository = repository;
        this.builtRevId = built_rev_id;
        if (!commits || !commits.length) {
            this.commits = [];
        } else {
            this.commits = commits;
        }
        this.commits = commits;
    }

}