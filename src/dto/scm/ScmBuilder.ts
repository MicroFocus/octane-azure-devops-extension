import {ScmData} from './ScmData';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as git from 'azure-devops-node-api/GitApi';
import {ScmRepository} from './ScmRepository';
import {ScmCommitFileChange} from './ScmCommitFileChange';
import {ScmCommit} from './ScmCommit';
import {VersionControlChangeType} from 'azure-devops-node-api/interfaces/GitInterfaces';


export class ScmBuilder {

    public static async buildScmData(connection: WebApi, projectName: string, toBuild: number): Promise<ScmData> {
        function convertType(changeType: number): string {
            return VersionControlChangeType[changeType].toLowerCase();
        }

        let scmCommit = new Array<ScmCommit>();
        let fromBuild: number = toBuild - 1;
        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let gitApi: git.IGitApi = await connection.getGitApi();
        let repos = await gitApi.getRepositories(projectName);
        let repo = repos[0];
        let changes_between_builds = await buildApi.getChangesBetweenBuilds(projectName, fromBuild, toBuild);
        if (!changes_between_builds || !changes_between_builds.length) {
            console.log('No changes were found for build ' + toBuild);
            return null;
        }
        let scmData: ScmData;
        let type = changes_between_builds[0].type;
        let scmRepo = new ScmRepository(type, repo.webUrl, repo.defaultBranch);
        console.log('Changes between builds [' + fromBuild + '] and [' + toBuild + ']');
        console.log(changes_between_builds);
        for (let change of changes_between_builds) {
            let time = new Date(change.timestamp).getTime();
            let comment = change.message;
            let user = change.author.displayName;
            let user_email = change.author.uniqueName;
            let commit = await gitApi.getCommit(change.id, repo.id, projectName);
            let revId = commit.commitId;
            let parentRevId = commit.parents[0];
            let changes = await gitApi.getChanges(revId, repo.id, projectName);
            let realChanges = changes.changes.filter((element) =>
                element.item.isFolder == null);
            let fileChanges = new Array<ScmCommitFileChange>();
            for (let realChange of realChanges) {
                let type: string = convertType(realChange.changeType);
                fileChanges.push(new ScmCommitFileChange(type, realChange.item.path));
            }
            scmCommit.push(new ScmCommit(time, user, revId, fileChanges, user_email, parentRevId, comment));
        }
        let build = await buildApi.getBuild(projectName, toBuild);
        scmData = new ScmData(scmRepo, build.buildNumberRevision, scmCommit);
        console.log('Created scmData:');
        console.log(scmData);
        return scmData;
    }
}

