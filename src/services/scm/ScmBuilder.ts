/*
 * Copyright 2020-2025 Open Text
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
import {ScmData} from '../../dto/scm/ScmData';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as git from 'azure-devops-node-api/GitApi';
import {IGitApi} from 'azure-devops-node-api/GitApi';
import {ScmRepository} from '../../dto/scm/ScmRepository';
import {ScmCommitFileChange} from '../../dto/scm/ScmCommitFileChange';
import {ScmCommit} from '../../dto/scm/ScmCommit';
import {VersionControlChangeType} from 'azure-devops-node-api/interfaces/GitInterfaces';
import {LogUtils} from "../../LogUtils";
import {GitHubAttributes, Utility} from "./Utils";
import * as util from "util";
import {BuildQueryOrder, BuildRepository, Change} from "azure-devops-node-api/interfaces/BuildInterfaces";

var request = require('request');

const defaultNumberToFetch = 1000;
const allowChangeTypes ={
    "add":"add",
    "edit":"edit",
    "delete":"delete",
    "rename":"add",
}

export class ScmBuilder {

    public static async buildScmData(connection: WebApi, projectName: string, toBuild: number, sourceBranchName: string, tl: any, logger: LogUtils): Promise<ScmData> {
        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let gitApi: git.IGitApi = await connection.getGitApi();

        const definitionId = tl.getVariable("System.DefinitionId");

        let build = await buildApi.getBuild(projectName, toBuild);

        let builds = await buildApi.getBuilds(
            projectName,
            [definitionId],                       // definitions: number[]
            null,                       // queues: number[]
            null,                       // buildNumber
            null,                      // minFinishTime
            null,                       // maxFinishTime
            null,                       // requestedFor: string
            null,                       // reason
            null,
            null,
            null,                       // tagFilters: string[]
            null,                        // properties: string[]
            2,                               // top: number
            null,
            null,
            null,
            BuildQueryOrder.StartTimeDescending,                               // top: number
        );
        logger.info("Builds: " + JSON.stringify(builds));

        let buildChanges;

        if (builds && builds.length > 1) {
            let from = builds[1];
            logger.info("Git revision from [" + from.sourceVersion + ":" + build.sourceVersion + "]");
            logger.info("RepoType : " + build.repository.type);

            if (from.sourceVersion === build.sourceVersion) {
                //Git external brings the last changes even there were no changes between 2 builds
                logger.info('No changes were found for build [' + toBuild + ']');
                return null;
            } else if (build.repository.type === 'TfsGit') {
                //TfsGit always brings ALL changes for each build
                //it works for Azure DevOps Server 2020 and does not for 2019
                //not working because header API version is not correct and result is not returning
                buildChanges = await buildApi.getChangesBetweenBuilds(projectName, from.id, toBuild,defaultNumberToFetch);
                if(!buildChanges) {
                    logger.warn('Failed to get changes using Azure API, retrying using direct API');
                    buildChanges = await this.getChangesBetweenBuilds(projectName, from.id, toBuild, connection);
                    if(!buildChanges){
                        logger.warn('Failed to get changes using Azure direct Rest API, retrying using build commits');
                        let buildChangesFrom =  await buildApi.getBuildChanges(projectName,from.id,null,defaultNumberToFetch);
                        buildChanges =  await buildApi.getBuildChanges(projectName,toBuild,null,defaultNumberToFetch);
                        if(buildChanges && buildChangesFrom?.length > 0) {
                            buildChanges = buildChanges.filter(({id: id1}) => !buildChangesFrom.some(({id: id2}) => id2 === id1));
                        }
                    }
                }
                logger.info(buildChanges ? buildChanges.length : 0 + ' changes were found between builds [' + from.id + ',' + toBuild + ']');
                logger.debug("Diff buildChanges: " + JSON.stringify(buildChanges));
                if(buildChanges?.length === defaultNumberToFetch){
                    logger.warn('Found 1000 commits, you may have more commits that will not be send');
                }
            } else {
                buildChanges = await buildApi.getBuildChanges(projectName, toBuild,null,defaultNumberToFetch);
                const buildChangesFrom = await buildApi.getBuildChanges(projectName, from.id,null,defaultNumberToFetch);
                if(buildChanges && buildChangesFrom?.length > 0) {
                    buildChanges = buildChanges.filter(({ id: id1 }) => !buildChangesFrom.some(({ id: id2 }) => id2 === id1));
                }
            }
        }


        if (!buildChanges || !buildChanges.length) {
            logger.info('No changes were found for build [' + toBuild + ']');
            return null;
        }
        logger.debug('Changes for build [' + toBuild + ']');
        logger.debug(buildChanges);

        let repo = build.repository;
        let scmData = await this.setData(repo.type, repo, buildChanges, gitApi, projectName,
            build.buildNumberRevision, build.repository.id, sourceBranchName, tl, logger);
        logger.info("ScmData was created");
        logger.debug(scmData);

        return scmData;
    }

    private static async setData(type: string, repo: BuildRepository, changes: Change[], gitApi: IGitApi,
                                 projectName: string, buildNumber: number, repoId: string, sourceBranchName: string,
                                 tl: any, logger: LogUtils): Promise<ScmData> {
        function convertType(changeType: number): string[] {
            let changeTypeResult = [];
            logger.debug('Change type value: ' + changeType );
            if(VersionControlChangeType[changeType] && allowChangeTypes[VersionControlChangeType[changeType].toLowerCase()]) {
                return [allowChangeTypes[VersionControlChangeType[changeType].toLowerCase()]];
            } else {
                for (const versionControlChangeTypeValue in VersionControlChangeType) {
                    const value = Number(VersionControlChangeType[versionControlChangeTypeValue]);
                    if(value && (value & changeType) > 0 && VersionControlChangeType[value & changeType] &&
                        allowChangeTypes[VersionControlChangeType[value & changeType].toLowerCase()]){
                        changeTypeResult.push(allowChangeTypes[VersionControlChangeType[value & changeType].toLowerCase()]);
                    }
                }
                if(changeTypeResult.length > 0){
                    return changeTypeResult;
                }
            }
            logger.warn('Change type was not found or not supported by Octane: ' + changeType);
            return changeTypeResult;
        }

        function convertGitType(changeType: string): string {
            logger.debug('Change type value: ' + changeType );
            switch (changeType) {
                case 'removed' :
                    return 'delete';
                case 'added':
                case 'renamed':
                    return 'add';
                case 'modified':
                    return 'edit';
            }
        }

        let scmData: ScmData;
        let scmCommit = new Array<ScmCommit>();
        logger.info('Repository type: ' + type)
        for (let change of changes) {
            let time = new Date(change.timestamp).getTime();
            let comment = change.message;
            let user = change.author.displayName;
            let user_email = change.author.uniqueName ? change.author.uniqueName : change.author.id;
            let revId = change.id;
            let parentRevId: string;
            let fileChanges = new Array<ScmCommitFileChange>();
            switch (type) {
                case 'TfsGit':
                    let commitTfsGit = await gitApi.getCommit(change.id, repo.id, projectName);
                    parentRevId = commitTfsGit.parents[0];
                    let changes = await gitApi.getChanges(revId, repo.id, projectName);
                    let realChanges = changes.changes.filter((element) =>
                        element.item.isFolder == null);

                    for (let realChange of realChanges) {
                        logger.debug('Change found: ' + realChange );
                        let types: string[] = convertType(realChange.changeType);
                        types.forEach(type =>fileChanges.push(new ScmCommitFileChange(type, realChange.item.path)));
                    }
                    break;
                case 'Git':
                case 'GitHubEnterprise':
                case 'GitHub':
                    //todo FIND/CHECK the way to fetch commits by bulk and not one by one!
                    let giHubService = tl.getInput('GithubRepositoryConnection', true);
                    logger.info('giHubService = ' + giHubService);
                    let endpointGitAuth = tl.getEndpointAuthorization(tl.getInput('GithubRepositoryConnection', true));
                    let githubAccessToken = Utility.getGithubEndPointToken(endpointGitAuth);
                    logger.info('Repository type: ' + type)
                    logger.debug('githubAccessToken = ' + githubAccessToken);

                    let testCommit = await this.getCommit(githubAccessToken, repoId, change.id);
                    let commit = JSON.parse(testCommit['body']);
                    logger.debug('commit: ' + JSON.stringify(commit));
                    revId = commit[GitHubAttributes.sha];
                    parentRevId = commit[GitHubAttributes.parents][0][GitHubAttributes.sha];
                    for (let file of commit[GitHubAttributes.files]) {
                        let type: string = convertGitType(file[GitHubAttributes.status]);
                        let filePath = file[GitHubAttributes.filename].includes('/') ? file[GitHubAttributes.filename] : '/' + file[GitHubAttributes.filename];
                        fileChanges.push(new ScmCommitFileChange(type, filePath));
                        if('renamed' === file[GitHubAttributes.status] && file[GitHubAttributes.previousFile]){
                            const prevFile = file[GitHubAttributes.previousFile].includes('/') ? file[GitHubAttributes.previousFile] : '/' + file[GitHubAttributes.previousFile];
                            fileChanges.push(new ScmCommitFileChange('delete', prevFile));
                        }
                    }
                    break;
                default:
                    logger.error('Unknown repository type: ' + type);
            }
            scmCommit.push(new ScmCommit(time, user, revId, fileChanges, user_email, parentRevId, comment));
        }

        let url = type === 'TfsGit' ? repo.url : changes[0].displayUri.split('/commit')[0];
        let scmRepo = new ScmRepository(type, url, sourceBranchName);
        scmData = new ScmData(scmRepo, buildNumber, scmCommit);

        return scmData;
    }

    private static async getCommit(githubEndpointToken: string, repositoryName: string, commitSha: string): Promise<any> {
        var options = {
            url: util.format(GitHubAttributes.getCommitUrlFormat, Utility.getGitHubApiUrl(), repositoryName, commitSha),
            headers: {
                "Content-Type": "application/json",
                'Authorization': 'token ' + githubEndpointToken,
                'User-Agent': 'request'
            }
        };
        return await util.promisify(request)(options);
    }

    private static async getChangesBetweenBuilds(projectName,fromBuild,toBuild,connection: WebApi): Promise<any>{

        let url = connection.serverUrl + "/" + projectName +"/" + "_apis/build/changes?frombuildid=" +fromBuild + "&tobuildid=" + toBuild
           + "&$top=" + defaultNumberToFetch;
        let options = {
            acceptHeader:"application/json;api-version=6.0-preview.2",
        }
        let buildChanges = await connection.rest.get(url,options);

        return buildChanges?.result ? buildChanges?.result["value"] : null;
    }
}

