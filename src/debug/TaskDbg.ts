import * as fs from 'fs';
const TOML = require('@ltd/j-toml');
import {StartTask} from '../StartTask';
import {EndTask} from "../EndTask";
import {BaseTask} from "../BaseTask";
import {DebugConf, DebugConfToDebugMapsConverter} from "./debug-conf";
import {AzurePipelineTaskLibMock, initAzureTaskMock} from "./task-mock-initializer";
import {InputConstants, SystemVariablesConstants} from "../ExtensionConstants";
import {EndpointAuthorization} from "azure-pipelines-task-lib";

let azureTaskMock: AzurePipelineTaskLibMock = <AzurePipelineTaskLibMock>{};
let conf: DebugConf;

function initDebugConfFromInputParametersFile() {
    let confFilePath: string = '';

    for(let arg in process.argv) {
        if(process.argv[arg].includes("debugConf")) {
            confFilePath = process.argv[arg];
        }
    }

    if(confFilePath.length == 0) {
        throw new Error("No 'debugConf' parameter file specified. Please look into ../../conf folder for an example and provide one");
    }

    confFilePath = confFilePath.split('=')[1];

    let buffer = fs.readFileSync(confFilePath);
    let confData = TOML.parse(buffer, 1.0, '\n', false);
    console.log(confData);

    conf = DebugConfToDebugMapsConverter.convert(confData);
}

function printNodeVersion() {
    let envNodeVersion = azureTaskMock.execSync(`node`, `--version`);
    console.log('Env node version: ' + envNodeVersion.stdout);

    let processArgNodeVersion = process.argv[0];
    if(processArgNodeVersion.includes("node.exe")) {
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
    initDebugConfFromInputParametersFile();
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

