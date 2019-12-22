import tl = require('azure-pipelines-task-lib/task');
import tlr = require('azure-pipelines-task-lib/toolrunner');
import {StartTask} from './StartTask';
import {EndTask} from "./EndTask";
import {BaseTask} from "./BaseTask";
import {LogUtils} from "./LogUtils";

let testTask = {};
let input = new Map();
let sysVar = new Map();

input.set('OctaneServiceConnection', 'Octane');
input.set('gitHubServiceConnection', 'gitHub');
input.set('WorkspaceList', '6001');

sysVar.set('System.TeamFoundationCollectionUri', 'https://dev.azure.com/evgenelokshin0206/');
sysVar.set('System.TeamProjectId', 'f2300d18-3a9d-4c64-b03a-18a00082a737');
sysVar.set("agent.proxyurl", null);
sysVar.set('ALMOctaneLogLevel', 'debug');
sysVar.set('ENDPOINT_DATA_Octane_INSTANCE_ID', 'octane123');
// sysVar.set('ENDPOINT_DATA_Octane_AZURE_PERSONAL_ACCESS_TOKEN', 'fzhzniawld2wh524y2h2sft2ksm23nanspwk6blg4lxhegirixcq'); //evgenelokshin
sysVar.set('ENDPOINT_DATA_Octane_AZURE_PERSONAL_ACCESS_TOKEN', '4xgexy6mionli6455wvyeutmeaicgqrpvepxqgnapirt2mj7jxsa'); //el0206


function initRepository(type: string) {
    if (type == 'int') {
        sysVar.set('System.TeamProject', 'TestProjectEvgeny');
        sysVar.set('Build.DefinitionName', 'TestProject');
        sysVar.set('Build.BuildId', '34');
    } else {
        sysVar.set('System.TeamProject', 'GitTestProject');
        sysVar.set('Build.DefinitionName', 'elokshin.hpe-demo-app');
        sysVar.set('Build.BuildId', '42');
    }
}

let auth = {
    parameters: {'username': 'Azure Devops Service_kv1dl33m7nmdnfgpr1ddxly4g', 'password': '+1b4cee72b67e1d67Y'},
    scheme: 'username'
};

let gitHubAuth = {
    parameters: {'accessToken': '50b6cc336829d163c6c34b41137bf66ee58952ed'},
    scheme: 'PersonalAccessToken'
};

function initTl(testTask: any) {
    let logger = new LogUtils('debug');
    logger.debug("blablalbla");
    logger.debug("****blablalbla", logger.getCaller());
    logger.debug("****blablalbla");
    // initRepository('ext');
    initRepository('int');
    testTask.execSync = (tool: string, args: string | string[], options?: tlr.IExecSyncOptions) => {
        return tl.execSync(tool, args, options);
    };
    testTask.getEndpointUrl = (id: string, optional: boolean) => {
        return 'https://almoctane-eur.saas.microfocus.com/ui/?p=173006';
        // return 'http://10.14.83.153:8080/ui/?p=1001/1002';
        // return 'https://qa52.almoctane.com/ui/?admin&p=1002/1002';
    };
    testTask.getInput = (name: string, required?: boolean) => {
        return input.get(name);
    };

    testTask.getEndpointAuthorization = (name: string, required?: boolean) => {
        switch (name) {
            case 'Octane':
                return auth;
            case 'gitHub':
                return gitHubAuth;
        }
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

let endpointGitAuth = task.getEndpointAuthorization(task.getInput('gitHubServiceConnection'), false);
let token = endpointGitAuth.parameters['accessToken'];
console.log('token=' + token);

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

