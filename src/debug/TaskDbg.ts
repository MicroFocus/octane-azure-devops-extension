import {StartTask} from '../StartTask';
import {EndTask} from "../EndTask";
import {BaseTask} from "../BaseTask";
import {DebugConf} from "./debug-conf";
import {AzurePipelineTaskLibMock, initAzureTaskMock} from "./task-mock-initializer";
import {InputConstants, SystemVariablesConstants} from "../ExtensionConstants";
import {EndpointAuthorization} from "azure-pipelines-task-lib";
import {initDebugConfFromInputParametersFile} from "./debug-conf-file-initializer";

let azureTaskMock: AzurePipelineTaskLibMock = <AzurePipelineTaskLibMock>{};
let conf: DebugConf;

function printNodeVersion() {
    let envNodeVersion = azureTaskMock.execSync(`node`, `--version`);
    console.log('Env node version: ' + envNodeVersion.stdout);

    let processArgNodeVersion = process.argv[0];
    if (processArgNodeVersion.includes("node.exe")) {
        console.log('Process argv node version: ' + processArgNodeVersion);
    }
}

function printOctaneServiceConnectionDetails() {
    let octaneServiceConnection = azureTaskMock.getInput(InputConstants.OCTANE_SERVICE_CONNECTION);
    let endpointAuth: EndpointAuthorization = azureTaskMock.getEndpointAuthorization(octaneServiceConnection);

    console.log('Octane service connection: ' + octaneServiceConnection);
    console.log('Authentication scheme: ' + endpointAuth.scheme);
    console.log('Parameters: ' + endpointAuth.parameters);
}

function initialize() {
    conf = initDebugConfFromInputParametersFile();
    initAzureTaskMock(azureTaskMock, conf);
    printNodeVersion();
    printOctaneServiceConnectionDetails();
}

async function runTasks() {
    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_NAME, BaseTask.ALM_OCTANE_PIPELINE_START);
    let startTask: StartTask = await StartTask.instance(azureTaskMock);
    await startTask.run();

    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_NAME, 'C');
    let startInnerTask: StartTask = await StartTask.instance(azureTaskMock);
    await startInnerTask.run();

    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_NAME, 'C');
    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_STATUS, 'Failed');
    let endInnerTask: EndTask = await EndTask.instance(azureTaskMock);
    await endInnerTask.run();

    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_NAME, BaseTask.ALM_OCTANE_PIPELINE_END);
    conf.systemVariables.set(SystemVariablesConstants.AGENT_JOB_STATUS, 'Succeeded');
    let endTask: EndTask = await EndTask.instance(azureTaskMock);
    await endTask.run();
}

initialize();
runTasks().catch(err => console.error(err));

