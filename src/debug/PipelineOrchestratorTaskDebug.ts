/*
 * Copyright 2020-2023 Open Text
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
    console.log('Parameters: ' + JSON.stringify(endpointAuth.parameters));
}

function initialize() {
    conf = initDebugConfFromInputParametersFile();
    initAzureTaskMock(azureTaskMock, conf);
    printNodeVersion();
    printOctaneServiceConnectionDetails();
}

async function runTasks() {
    let counter = 0;

    let fn = async () => {
        try {
            let pipelinesOrchestratorTask: PipelinesOrchestratorTask = await PipelinesOrchestratorTask.instance(azureTaskMock);
            await pipelinesOrchestratorTask.run();
        } catch(ex) {
            console.log(ex);
        } finally {
            if (counter < 10) {
                console.log('Scheduling a new pipelines orchestrator task');
                setTimeout(fn, 5 * 1000);
            }

            counter++;
        }
    }

    setTimeout(fn, 5 * 1000);
}

initialize();
runTasks().catch(err => console.error(err));
