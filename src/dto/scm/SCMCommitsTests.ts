import {ScmCommitFileChange} from "./ScmCommitFileChange";
import {GitHubAttributes} from "./Utils";
import {VersionControlChangeType} from "azure-devops-node-api/interfaces/GitInterfaces";

const fs = require('fs');

function convertGitType(changeType: string): string {
    return changeType == 'removed' ? 'added': changeType;
}
const results = fs.readFileSync('commit_from_git.txt', 'utf-8');
let commit = JSON.parse(results);
let revId = commit[GitHubAttributes.sha];
let parentRevId = commit[GitHubAttributes.parents][0][GitHubAttributes.sha];
let fileChanges = new Array<ScmCommitFileChange>();
for (let file of commit[GitHubAttributes.files]){

    let type: string = convertGitType(file[GitHubAttributes.status]);
    fileChanges.push(new ScmCommitFileChange(type, file[GitHubAttributes.filename]));
    console.log("wait .... and check ...");
}

console.log(commit);

