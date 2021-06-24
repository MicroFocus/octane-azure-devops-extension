import azurePipelinesTaskLibTask = require('azure-pipelines-task-lib/task');
import azurePipelinesTaskLibToolRunner = require('azure-pipelines-task-lib/toolrunner');
import {LogUtils} from '../LogUtils';
import {EndpointDataConstants, SystemVariablesConstants} from '../ExtensionConstants';
import {DebugConf} from './debug-conf';

export interface AzurePipelineTaskLibMock {
    execSync(tool: string, args: string | string[], options?: azurePipelinesTaskLibToolRunner.IExecSyncOptions): azurePipelinesTaskLibToolRunner.IExecSyncResult;

    getEndpointUrl(id: string, optional: boolean): string;

    getInput(name: string, required?: boolean): any;

    getEndpointAuthorization(name: string, required?: boolean): any;

    getEndpointDataParameter(id: string, key: string, optional: boolean): any;

    getVariable(name: string): any;

    setResult(result: any, message: string, done?: boolean);

    setVariable(name: string, val: string, secret?: boolean);
}

export function initAzureTaskMock(azureTaskMock: AzurePipelineTaskLibMock, conf: DebugConf): AzurePipelineTaskLibMock {
    let logger = new LogUtils(conf.systemVariables.get(SystemVariablesConstants.ALM_OCTANE_LOG_LEVEL));
    logger.debug('Initialization of Azure DevOps task mock', logger.getCaller());

    azureTaskMock.execSync = (tool: string, args: string | string[], options?: azurePipelinesTaskLibToolRunner.IExecSyncOptions) => {
        return azurePipelinesTaskLibTask.execSync(tool, args, options);
    };
    azureTaskMock.getEndpointUrl = (id: string, optional: boolean) => {
        return conf.systemVariables.get(EndpointDataConstants.ENDPOINT_URL);
    };
    azureTaskMock.getInput = (name: string, required?: boolean) => {
        return conf.input.get(name);
    };

    azureTaskMock.getEndpointAuthorization = (name: string, required?: boolean) => {
        switch (name) {
            case 'Octane':
                return conf.octaneAuthentication;
            case 'gitHub':
                return conf.gitHubAuthentication;
        }
    };

    azureTaskMock.getEndpointDataParameter = (id: string, key: string, optional: boolean) => {
        let name = 'ENDPOINT_DATA_' + id + '_' + key.toUpperCase();

        if (conf.systemVariables.has(name)) {
            return conf.systemVariables.get(name);
        }

        return undefined;
    };

    azureTaskMock.getVariable = (name: string) => {
        return conf.systemVariables.get(name);
    };

    // @ts-ignore
    azureTaskMock.TaskResult = azurePipelinesTaskLibTask.TaskResult;

    azureTaskMock.setResult = (result: any, message: string, done?: boolean) => {
        azurePipelinesTaskLibTask.setResult(result, message, done);
    };

    azureTaskMock.setVariable = (name: string, val: string, secret?: boolean) => {
        conf.systemVariables.set(name, val);
    };

    return azureTaskMock;
}