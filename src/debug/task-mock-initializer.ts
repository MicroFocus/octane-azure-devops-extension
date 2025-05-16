/*
 * Copyright 2020-2025 Open Text
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import azurePipelinesTaskLibTask = require('azure-pipelines-task-lib/task');
import azurePipelinesTaskLibToolRunner = require('azure-pipelines-task-lib/toolrunner');
import {LogUtils} from "../LogUtils";
import {EndpointDataConstants, SystemVariablesConstants} from "../ExtensionConstants";
import {DebugConf} from "./debug-conf";

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
    logger.debug("Initialization of Azure DevOps task mock", logger.getCaller());

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