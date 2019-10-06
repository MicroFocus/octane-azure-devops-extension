import {ConnectionUtils} from '../../ConnectionUtils';
import {ScmBuilder} from './ScmBuilder';
import {WebApi} from 'azure-devops-node-api';
import {LogUtils} from "../../LogUtils";

let projectName = 'demo-app';

// let token: string = process.env.AZURE_PERSONAL_ACCESS_TOKEN;
const token = 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq';
const orgUrl = 'https://dev.azure.com/evgenelokshin';
let toBuild: number = 39;

let api: WebApi = ConnectionUtils.getWebApiWithProxy(orgUrl, token);

ScmBuilder.buildScmData(api, projectName, toBuild, new LogUtils('debug')).then(scm => {
    console.log('########################## finished ###############################');
    console.log(scm);
});

