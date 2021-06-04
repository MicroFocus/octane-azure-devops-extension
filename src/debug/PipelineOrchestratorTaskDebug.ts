import {PipelinesOrchestratorTask} from "../PipelinesOrchestratorTask";
import {DebugConf} from "./debug-conf";
import {AzurePipelineTaskLibMock, initAzureTaskMock} from "./task-mock-initializer";
import {InputConstants} from "../ExtensionConstants";
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
    let pipelinesOrchestratorTask: PipelinesOrchestratorTask = await PipelinesOrchestratorTask.instance(azureTaskMock);
    await pipelinesOrchestratorTask.run();
}

initialize();
runTasks().catch(err => console.error(err));
