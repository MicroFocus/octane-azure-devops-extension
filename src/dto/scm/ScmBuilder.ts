import {ScmData} from './ScmData';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as git from 'azure-devops-node-api/GitApi';
import {IGitApi} from 'azure-devops-node-api/GitApi';
import {ScmRepository} from './ScmRepository';
import {ScmCommitFileChange} from './ScmCommitFileChange';
import {ScmCommit} from './ScmCommit';
import {VersionControlChangeType} from 'azure-devops-node-api/interfaces/GitInterfaces';
import {LogUtils} from "../../LogUtils";
import {GitHubAttributes, Utility} from "./Utils";
import {Build, BuildRepository, Change} from "azure-devops-node-api/interfaces/BuildInterfaces";

export class ScmBuilder {

    public static async buildScmData(connection: WebApi, projectName: string, toBuild: number, logger: LogUtils): Promise<ScmData> {
        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let gitApi: git.IGitApi = await connection.getGitApi();

        let build = await buildApi.getBuild(projectName, toBuild);
        let buildChanges = await buildApi.getBuildChanges(projectName, toBuild);

        let repo = build.repository;
        if (!buildChanges || !buildChanges.length) {
            logger.info('No changes were found for build [' + toBuild + ']');
            return null;
        }
        logger.debug('Changes for build [' + toBuild + ']');
        logger.debug(buildChanges);
        let type = repo.type;
        let scmData = await this.setData(type, repo, buildChanges, gitApi, projectName,
            build.buildNumberRevision, build);
        logger.info("ScmData was created");
        logger.debug(scmData);
        return scmData;
    }

    private static async setData(type: string, repo: BuildRepository, changes: Change[], gitApi: IGitApi,
                                 projectName: string, buildNumber: number, build: Build): Promise<ScmData> {
        function convertType(changeType: number): string {
            return VersionControlChangeType[changeType].toLowerCase();
        }

        let scmData: ScmData;
        let scmCommit = new Array<ScmCommit>();
        let url = type === 'TfsGit' ? repo.url : changes[0].displayUri.split('/commit')[0];

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
                default:
                    break;
            }
            scmCommit.push(new ScmCommit(time, user, revId, fileChanges, user_email, parentRevId, comment));
        }
        let scmRepo = new ScmRepository(type, url, build.sourceBranch);
        scmData = new ScmData(scmRepo, buildNumber, scmCommit);

        return scmData;
    }
}

