import {ConnectionUtils} from "../../ConnectionUtils";
import {WebApi} from "azure-devops-node-api";
import {CiEventCauseBuilder} from "./CiEventCauseBuilder";

let projectName = 'demo-app';

// let token: string = process.env.AZURE_PERSONAL_ACCESS_TOKEN;
const token = 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq';
const orgUrl = 'https://dev.azure.com/evgenelokshin';
let fullBuildName = "My_Full_Build";
let toBuild: number = 39;

let api: WebApi = ConnectionUtils.getWebApiWithProxy(orgUrl, token);

CiEventCauseBuilder.buildCiEventCauses(true, api, projectName, toBuild, fullBuildName).then(causes => {
    console.log('########################## finished ###############################');
    console.log(causes);
});
