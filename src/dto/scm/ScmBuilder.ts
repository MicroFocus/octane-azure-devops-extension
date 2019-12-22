import {ScmData} from './ScmData';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as git from 'azure-devops-node-api/GitApi';
import {ScmRepository} from './ScmRepository';
import {ScmCommitFileChange} from './ScmCommitFileChange';
import {ScmCommit} from './ScmCommit';
import {VersionControlChangeType} from 'azure-devops-node-api/interfaces/GitInterfaces';
import {LogUtils} from "../../LogUtils";


export class ScmBuilder {
    public static async buildScmData(connection: WebApi, projectName: string, toBuild: number, logger: LogUtils): Promise<ScmData> {
        return null;
    }
}

