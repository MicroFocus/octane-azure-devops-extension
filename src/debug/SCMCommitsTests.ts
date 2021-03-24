import {ScmCommitFileChange} from "../dto/scm/ScmCommitFileChange";
import {GitHubAttributes} from "../dto/scm/Utils";

const fs = require('fs');

function convertGitType(changeType: string): string {
    return changeType == 'removed' ? 'added' : changeType;
}

const results = fs.readFileSync(process.cwd() + '/src/debug/resources/commit_from_git.txt', 'utf-8');
let commit = JSON.parse(results);
let revId = commit[GitHubAttributes.sha];
let parentRevId = commit[GitHubAttributes.parents][0][GitHubAttributes.sha];
let fileChanges = new Array<ScmCommitFileChange>();
for (let file of commit[GitHubAttributes.files]) {

    let type: string = convertGitType(file[GitHubAttributes.status]);
    fileChanges.push(new ScmCommitFileChange(type, file[GitHubAttributes.filename]));
    console.log("wait .... and check ...");
}

console.log(commit);

