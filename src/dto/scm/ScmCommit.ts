import {ScmCommitFileChange} from './ScmCommitFileChange';
import {DtoObject} from '../DtoObject';

export class ScmCommit extends DtoObject {
    time: number;
    user: string;
    revId: string;
    changes: ScmCommitFileChange[] = [];
    userEmail: string;
    parentRevId: string;
    comment: string;

    constructor(time: number, user: string, rev_id: string, changes: ScmCommitFileChange[], user_email?: string, parent_rev_id?: string, comment?: string) {
        super();
        this.time = time;
        this.user = user;
        this.revId = rev_id;
        if (!changes || !changes.length) {
            this.changes = [];
        } else {
            this.changes = changes;
        }
        this.userEmail = user_email;
        this.parentRevId = parent_rev_id;
        this.comment = comment;
    }
}