import {TestResultsBuilder} from "./TestResultsBuilder";
import {ConnectionUtils} from "../../ConnectionUtils";

let projectName = 'demo-app';

// let token: string = process.env.AZURE_PERSONAL_ACCESS_TOKEN;
const token = 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq';
const orgUrl = 'https://dev.azure.com/evgenelokshin';
let buildId: number = 34;

ConnectionUtils.getAzureDevopsConnection(token, orgUrl).then(con => {
    TestResultsBuilder.getTestsResultsByBuildId(con, projectName, buildId, 'sreverId', 'jobId').then(res => {
        console.log('######################### finished ###############################');
        console.log(res);
    })
});
