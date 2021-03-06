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
import {BuildRepository, Change} from "azure-devops-node-api/interfaces/BuildInterfaces";

var request = require('request');

export class ScmBuilder {

    public static async buildScmData(connection: WebApi, projectName: string, toBuild: number, sourceBranchName: string, tl: any, logger: LogUtils): Promise<ScmData> {
        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let gitApi: git.IGitApi = await connection.getGitApi();

        let build = await buildApi.getBuild(projectName, toBuild);
        let buildChanges = await buildApi.getBuildChanges(projectName, toBuild);
        logger.debug("Initial buildChanges: " + JSON.stringify(buildChanges));
        let builds = await buildApi.getBuilds(
            projectName,
            null,                       // definitions: number[]
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
            2                               // top: number
        );
        logger.info("Builds: " + JSON.stringify(builds));

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
                //it works for Azure DevOps Server 2020 and doeas not for 2019
                // buildChanges = await buildApi.getChangesBetweenBuilds(projectName, from.id, toBuild);
                let buildChangesFrom = await buildApi.getBuildChanges(projectName, from.id);
                buildChanges = buildChanges.filter(({ id: id1 }) => !buildChangesFrom.some(({ id: id2 }) => id2 === id1));
                logger.info(buildChanges ? buildChanges.length : 0 + ' changes were found between builds [' + from.id + ',' + toBuild + ']');
                logger.debug("Diff buildChanges: " + JSON.stringify(buildChanges));
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
        function convertType(changeType: number): string {
            return VersionControlChangeType[changeType].toLowerCase();
        }

        function convertGitType(changeType: string): string {
            switch (changeType) {
                case 'removed' :
                    return 'delete';
                case 'added':
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
                        let type: string = convertType(realChange.changeType);
                        fileChanges.push(new ScmCommitFileChange(type, realChange.item.path));
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
                    revId = commit[GitHubAttributes.sha];
                    parentRevId = commit[GitHubAttributes.parents][0][GitHubAttributes.sha];
                    for (let file of commit[GitHubAttributes.files]) {
                        let type: string = convertGitType(file[GitHubAttributes.status]);
                        let filePath = file[GitHubAttributes.filename].includes('/') ? file[GitHubAttributes.filename] : '/' + file[GitHubAttributes.filename];
                        fileChanges.push(new ScmCommitFileChange(type, filePath));
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
}

