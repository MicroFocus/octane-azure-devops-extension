import {ScmRepository} from './ScmRepository';
import {ScmData} from './ScmData';
import {ScmCommit} from './ScmCommit';
import {ScmCommitFileChange} from './ScmCommitFileChange';

const fs = require('fs');

const results = fs.readFileSync('scm.txt', 'utf-8');
let jsonObjectResults = JSON.parse(results);

const changes_between_builds = fs.readFileSync('changes_between_builds.txt', 'utf-8');
let changes_between_buildsJson = JSON.parse(changes_between_builds);
const repo = fs.readFileSync('repo.txt', 'utf-8');
let repoJson = JSON.parse(repo);

let type = changes_between_buildsJson.value[0].type;
let scmRepo = new ScmRepository(type, repoJson._links.web.href, repoJson.defaultBranch);
let scmCommit = new Array<ScmCommit>();

for (let change of changes_between_buildsJson.value) {
    let time = new Date(change.timestamp).getTime();
    let comment = change.message;
    let user = change.author.displayName;
    let user_email = change.author.uniqueName;
    let location = change.location;
    //get commit - call GET location URL
    let commit = fs.readFileSync('commit_' + change.id + '.txt', 'utf-8');
    let commitJson = JSON.parse(commit);
    let revId = commitJson.commitId;
    let parentRevId = commitJson.parents[0];
    let changeUrl = commitJson._links.changes.href;
    //get change - call GET changeUrl
    let changeData = fs.readFileSync('change_' + change.id + '.txt', 'utf-8');
    let changeDataJason = JSON.parse(changeData);
    let realChanges = changeDataJason.changes.filter((element) =>
        element.item.isFolder == null);
    let fileChanges = new Array<ScmCommitFileChange>();
    for (let realChange of realChanges) {
        fileChanges.push(new ScmCommitFileChange(realChange.changeType, realChange.item.path));
    }
    scmCommit.push(new ScmCommit(time, user, revId, fileChanges, user_email, parentRevId, comment));
}
//build_rev_id can be taken from last change parent revisionId
let scmData = new ScmData(scmRepo, null, scmCommit);

console.log(scmData);