import tl = require('azure-pipelines-task-lib/task');
import tlr = require('azure-pipelines-task-lib/toolrunner');
import { StartTask } from './StartTask';
import {EndTask} from "./EndTask";
import {BaseTask} from "./BaseTask";

let testTask = {};
let input = new Map();
let sysVar = new Map();

input.set('OctaneServiceConnection', 'Octane');
sysVar.set('System.TeamFoundationCollectionUri', 'https://dev.azure.com/evgenelokshin/');
sysVar.set('System.TeamProjectId', '86819eb3-d6b0-4490-ba8d-fe4d8e808656');
sysVar.set('System.TeamProject', 'demo-app');
sysVar.set('Build.DefinitionName', 'demo-app');
sysVar.set('Build.BuildId', '111');
sysVar.set('ENDPOINT_DATA_Octane_INSTANCE_ID', 'octane_server');
sysVar.set('ENDPOINT_DATA_Octane_AZURE_PERSONAL_ACCESS_TOKEN', 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq');

let auth = {parameters: {'username': 'stekel_y2kewqkppjp3rbv8o750gw435', 'password': '+c45b9ddf8689facD'}, scheme: 'username'};

function initTl(testTask: any) {
    testTask.execSync = (tool: string, args: string | string[], options?: tlr.IExecSyncOptions) => {
        return tl.execSync(tool, args, options);
    };
    testTask.getEndpointUrl = (id: string, optional: boolean) => {
        return 'http://ILstekel02.microfocus.com:8080/ui/?p=1001/1002';
    };
    testTask.getInput = (name: string, required?: boolean) => {
        return input.get(name);
    };

    testTask.getEndpointAuthorization = (name: string, required?: boolean) => {
        return auth;
    };

    testTask.getEndpointDataParameter = (id: string, key: string, optional: boolean) => {
        let name = 'ENDPOINT_DATA_' + id + '_' + key.toUpperCase();
        if (sysVar.has(name)) {
            return sysVar.get(name);
        }
        return undefined;
    };

    testTask.getVariable = (name: string) => {
        return sysVar.get(name);
    };

    testTask.TaskResult = tl.TaskResult;

    testTask.setResult = (result: any, message: string, done?: boolean) => {
        tl.setResult(result, message, done);
    };

    testTask.setVariable = (name: string, val: string, secret?: boolean) => {
        sysVar.set(name, val);
    };

    return testTask;
}

let task = initTl(testTask);
let result = task.execSync(`node`, `--version`);
console.log('node version = ' + result.stdout);

console.log(task.getInput('OctaneServiceConnection'));
let endpointAuth = task.getEndpointAuthorization(task.getInput('OctaneServiceConnection'), false);
let clientId = endpointAuth.parameters['username'];
let clientSecret = endpointAuth.parameters['password'];
console.log('clientId=' + clientId + " clientSecret=" + clientSecret);
process.env.HTTPS_PROXY = "http://web-proxy.il.softwaregrp.net:8080";
process.env.https_proxy = "http://web-proxy.il.softwaregrp.net:8080";
process.env.HTTP_PROXY = "http://web-proxy.il.softwaregrp.net:8080";
process.env.http_proxy = "http://web-proxy.il.softwaregrp.net:8080";

async function runTasks() {
    sysVar.set('Agent.JobName', BaseTask.ALM_OCTANE_PIPELINE_START);
    let startTask: StartTask = await StartTask.instance(task);
    await startTask.run();

    sysVar.set('Agent.JobName', 'C');
    let startInnerTask: StartTask = await StartTask.instance(task);
    await startInnerTask.run();

    sysVar.set('Agent.JobName', 'C');
    sysVar.set('AGENT_JOBSTATUS', 'Failed');
    let endInnerTask: EndTask = await EndTask.instance(task);
    await endInnerTask.run();

    sysVar.set('Agent.JobName', BaseTask.ALM_OCTANE_PIPELINE_END);
    sysVar.set('AGENT_JOBSTATUS', 'Succeeded');
    let endTask: EndTask = await EndTask.instance(task);
    await endTask.run();
}

runTasks().catch(err => console.error(err));

