
import { ScmCommit } from "./ScmCommit";
import { DtoObject } from "../DtoObject";
import {ScmRepository} from "./ScmRepository";

export class ScmData extends DtoObject {
    repository: ScmRepository;
    builtRevId: number;
    commits: ScmCommit[] = [];

    constructor(repository: ScmRepository, built_rev_id: number, commits: ScmCommit[]) {
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