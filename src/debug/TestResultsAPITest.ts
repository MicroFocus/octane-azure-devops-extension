import {TestResultsBuilder} from '../services/test_results/TestResultsBuilder';
import {ConnectionUtils} from '../ConnectionUtils';
import {WebApi} from 'azure-devops-node-api';
import {LogUtils} from "../LogUtils";
import {DebugConf} from "./debug-conf";
import {initDebugConfFromInputParametersFile} from "./debug-conf-file-initializer";
import {EndpointDataConstants, SystemVariablesConstants} from "../ExtensionConstants";

let api: WebApi;
let conf: DebugConf;
let projectName: string;
let buildId: number;
let token: string;
let orgUrl: string;
let pipelineName: string;

function initialize() {
    conf = initDebugConfFromInputParametersFile();

    orgUrl = conf.systemVariables.get(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
    projectName = conf.systemVariables.get(SystemVariablesConstants.SYSTEM_TEAM_PROJECT);
    pipelineName = conf.systemVariables.get(SystemVariablesConstants.BUILD_DEFINITION_NAME);
    buildId = parseInt(conf.systemVariables.get(SystemVariablesConstants.BUILD_BUILD_ID));
    token = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);

    api = ConnectionUtils.getWebApiWithProxy(orgUrl, token);
}

initialize();
TestResultsBuilder.getTestsResultsByBuildId(api, projectName, buildId, 'serverId', 'jobId', "../reports", new LogUtils('debug')).then(res => {
    console.log('######################### finished ###############################');
    console.log(res);
});


