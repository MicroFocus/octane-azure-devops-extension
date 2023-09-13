/*
 * Copyright 2020-2023 Open Text
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {ScmCommitFileChange} from "../dto/scm/ScmCommitFileChange";
import {GitHubAttributes} from "../services/scm/Utils";

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

