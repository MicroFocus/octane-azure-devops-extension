import {ConnectionUtils} from "../../ConnectionUtils";
import {ScmBuilder} from "./ScmBuilder";

let projectName = 'demo-app';

// let token: string = process.env.AZURE_PERSONAL_ACCESS_TOKEN;
const token = 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq';
const orgUrl = 'https://dev.azure.com/evgenelokshin';
let toBuild: number = 35;

ConnectionUtils.getAzureDevopsConnection(token, orgUrl).then(con => {
    ScmBuilder.buildScmData(con, projectName, toBuild).then(scm => {
        console.log('########################## finished ###############################');
        console.log(scm);
    })
});

