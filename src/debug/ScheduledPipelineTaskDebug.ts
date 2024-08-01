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
import {DebugConf} from "./debug-conf";
import {AzurePipelineTaskLibMock} from "./task-mock-initializer";
import {
    AzureDevOpsApiVersions,
    EndpointDataConstants,
    InputConstants,
    SystemVariablesConstants
} from "../ExtensionConstants";
import {initDebugConfFromInputParametersFile} from "./debug-conf-file-initializer";
import {OctaneConnectionUtils} from "../OctaneConnectionUtils";
import {URL} from "url";
import {MetadataUtils} from "../MetadataUtils";
import {SharedSpaceUtils} from "../SharedSpaceUtils";
import {Octane} from "@microfocus/alm-octane-js-rest-sdk";

let azureTaskMock: AzurePipelineTaskLibMock = <AzurePipelineTaskLibMock>{};
let conf: DebugConf;
let url: URL;
let customWebContext: string;
let sharedSpaceId: string;
let workspaces: any;
let analyticsCiInternalApiUrlPart: string;
let selfIdentity: string;
let http = require('http');

let SHARED_SPACE_INTERNAL_API_PATH_PART = "/internal-api/shared_spaces/";
let SHARED_SPACE_API_PATH_PART = "/api/shared_spaces/";
let ANALYTICS_CI_PATH_PART = "/analytics/ci/";
let VULNERABILITIES = "/vulnerabilities";
let VULNERABILITIES_PRE_FLIGHT = "/vulnerabilities/preflight";
let OPEN_VULNERABILITIES_FROM_OCTANE = "/vulnerabilities/remote-issue-ids";
let ACCEPT_HEADER = "accept";
let CORRELATION_ID_HEADER = "X-Correlation-ID";
let CONTENT_TYPE_HEADER = "content-type";
let CONTENT_ENCODING_HEADER = "content-encoding";
let GZIP_ENCODING = "gzip";
let SCMDATA_API_PATH_PART = "/scm-commits";

function printNodeVersion() {
    // let envNodeVersion = azureTaskMock.execSync(`node`, `--version`);
    // console.log('Env node version: ' + envNodeVersion.stdout);

    let processArgNodeVersion = process.argv[0];
    if (processArgNodeVersion.includes("node.exe")) {
        console.log('Process argv node version: ' + processArgNodeVersion);
    }
}

function printOctaneServiceConnectionDetails() {
    // let octaneServiceConnection = azureTaskMock.getInput(InputConstants.OCTANE_SERVICE_CONNECTION);
    // let endpointAuth: EndpointAuthorization = azureTaskMock.getEndpointAuthorization(octaneServiceConnection);
    //
    // console.log('Octane service connection: ' + octaneServiceConnection);
    // console.log('Authentication scheme: ' + endpointAuth.scheme);
    // console.log('Parameters: ' + endpointAuth.parameters);
}

function validateOctaneUrlAndExtractSharedSpaceId() {
    sharedSpaceId = SharedSpaceUtils.validateOctaneUrlAndExtractSharedSpaceId(url);
}

function prepareOctaneUrlAndCustomWebContext() {
    let endpointUrl = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_URL);
    url = new URL(endpointUrl);

    console.log('rawUrl = ' + endpointUrl + '; url.href = ' + url.href);

    customWebContext = url.pathname.toString().split('/ui/')[0].substring(1);
    console.log('customWebContext = ' + customWebContext);
}

function prepareWorkspaces() {
    workspaces = conf.input.get(InputConstants.WORKSPACES_LIST);

    console.log('workspaces = ' + workspaces);

    workspaces = workspaces.split(',').map(s => s.trim());
}

function buildAnalyticsCiInternalApiUrlPart() {
    analyticsCiInternalApiUrlPart = SHARED_SPACE_INTERNAL_API_PATH_PART + sharedSpaceId + ANALYTICS_CI_PATH_PART;
}

function prepareSelfIdentity() {
    selfIdentity = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_DATA_OCTANE_INSTANCE_ID); //nanoid() + "ScheduledPipelineTaskDebug";
}

function initialize() {
    conf = initDebugConfFromInputParametersFile();
    printNodeVersion();
    printOctaneServiceConnectionDetails();

    prepareSelfIdentity();
    prepareOctaneUrlAndCustomWebContext();
    validateOctaneUrlAndExtractSharedSpaceId();
    prepareWorkspaces();
    buildAnalyticsCiInternalApiUrlPart();
}

function buildGetAbridgedTaskAsyncQueryParams() {
    let result = "?";
    result = result + "self-type=" + "azure_devops";
    result = result + "&self-url=" + "";// SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI when running from AzureDevOps should be
    result = result + "&api-version=" + "1";
    result = result + "&sdk-version=" + "0";
    result = result + "&plugin-version=" + "1";
    result = result + "&client-id=" + "";
    result = result + "&ci-server-user=" + "";

    return result;
}

async function sendAckResponse(octaneSDKConnection: any, taskId: string) {
    const url =  analyticsCiInternalApiUrlPart + '/servers/' + selfIdentity + "/tasks/" + taskId + "/result";
    const body = {status: 201};

    const options = {
        headers: {ACCEPT_HEADER: 'application/json'},
        json: true,
    }

    let ret = await octaneSDKConnection.executeCustomRequest(url, Octane.operationTypes.update, body);
    console.log(ret.status);
}

async function runPipeline(ret: any) {
    let collectionUri = conf.systemVariables.get(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
    let token = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);
    let teamProjectId = conf.systemVariables.get(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID);
    let sourceBranchName = conf.systemVariables.get(SystemVariablesConstants.BUILD_SOURCE_BRANCH_NAME);
    let pipelineName = conf.systemVariables.get(SystemVariablesConstants.BUILD_DEFINITION_NAME);

    let url = new URL(collectionUri);

    let p = new Promise(function (resolve, reject) {
        const getPipelinesReq = http.get({
            host: url.hostname,
            path: url.pathname + teamProjectId + '/_apis/pipelines?' + AzureDevOpsApiVersions.API_VERSION_6_0_PREVIEW,
            headers: {
                'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
            }
        }, function (response) {
            if (response.statusCode == 200) {
                response.on('data', d => {
                    resolve(JSON.parse(d));
                });
            } else {
                reject();
            }
        });

        getPipelinesReq.on('error', error => {
            reject(error);
        });
    });

    let pipelineData: any = await p;

    if (pipelineData != undefined && pipelineData['value'] != undefined && pipelineData['value'].length > 0) {
        let pipelineId = -1;

        for (let i = 0; i < pipelineData['value'].length; i++) {
            if (pipelineData['value'][i].name === pipelineName) {
                pipelineId = pipelineData['value'][i].id;
                break;
            }
        }

        if (pipelineId == -1) {
            throw new Error('No such pipeline found');
        }

        let data = JSON.stringify({
            'stagesToSkip': [],
            'resources': {'repositories': {'self': {'refName': 'refs/heads/' + sourceBranchName}}},
            'variables': {}
        });

        p = new Promise(function (resolve, reject) {
            const req = http.request({
                host: url.hostname,
                method: 'POST',
                path: url.pathname + teamProjectId + '/_apis/pipelines/' + pipelineId + '/runs?' + AzureDevOpsApiVersions.API_VERSION_6_0_PREVIEW,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, function (response) {
                console.log('statusCode:' + response.statusCode);
                console.log(response);

                if (response.statusCode == 200) {
                    response.on('data', d => {
                        resolve(JSON.parse(d));
                    });
                } else {
                    reject();
                }
            });

            req.on('error', error => {
                console.error(error);
                reject(error);
            });

            req.write(data);
            req.end();
        });

        await p.then(response => {
            console.log(response);
        }).catch(reject => {
            console.log(reject);
        });
        //console.log(result);
    }
}

async function runScheduledTask() {
    let clientId = conf.octaneAuthentication.parameters['username'];
    let clientSecret = conf.octaneAuthentication.parameters['password'];

    let octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(url, customWebContext, sharedSpaceId,
        workspaces[0], clientId, clientSecret);
    await MetadataUtils.enhanceOctaneSDKConnectionWithEntitiesMetadata(octaneSDKConnection);

    let counter = 0;
    let fn = async () => {
        const url = analyticsCiInternalApiUrlPart + 'servers/' + selfIdentity + "/tasks" + buildGetAbridgedTaskAsyncQueryParams();

        let ret;
        const options = {
            headers: {ACCEPT_HEADER: 'application/json'},
            json: true,
        }
        try {
            // retrieving the job, if any, from Octane
            ret = await octaneSDKConnection.executeCustomRequest(url, Octane.operationTypes.get);
            console.log(ret);
            // sending back ACK
            if (ret != undefined) {
                await sendAckResponse(octaneSDKConnection, ret[0].id);
                await runPipeline(ret);
            }
        } catch (e) {
            console.log(e);
        } finally {
            if (counter < 10) {
                console.log('scheduling a new request');
                setTimeout(fn, 5 * 1000);
            }

            counter++;
        }
    }

    setTimeout(fn, 5 * 1000);
}

initialize();
runScheduledTask().catch(err => console.error(err));