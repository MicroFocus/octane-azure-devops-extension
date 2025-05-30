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
import {AzureDevOpsApiVersions, SystemVariablesConstants} from "../../ExtensionConstants";
import {URL} from "url";
import {Task} from "../../dto/tasks/Task";
import * as http from "http";
import {LogUtils} from "../../LogUtils";
import {TaskProcessorResult} from "../../dto/tasks/TaskProcessorResult";

export class AzurePipelinesService {
    public static async run(task: Task, tl: any, token: string, logger: LogUtils): Promise<any> {
        let collectionUri = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
        let teamProject = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT);
        let teamProjectId = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID);
        let pipelineName = tl.getVariable(SystemVariablesConstants.BUILD_DEFINITION_NAME);

        logger.info('The pipeline name where the orchestrator task is running: ' + pipelineName);
        logger.info('Please make sure that in this pipeline, the orchestrator job/task is the only one running!');

        let result: any;
        let statusCode: number = 400;

        let jobCiIdParts = JobCiIdParts.from(task.jobCiId);

        if (!(jobCiIdParts.teamProject === teamProject)) {  // This should not happen, ever
            let errorMsg = 'Something went wrong as the team project of the orchestrator task(' + teamProject +
                ') and the job from Octane(' + task.jobCiId + ') do not match! Cannot fulfill the request!';
            logger.error(errorMsg);

            return this.getTaskProcessorResult(task, statusCode, errorMsg);
        }

        let url = new URL(collectionUri);

        logger.info('Requesting pipelines from: ' + url + ' and teamProjectId: ' + teamProjectId);

        let pipelinesData: any = await this.getPipelines(url, teamProjectId, token);

        logger.info('Received pipelines: ');
        logger.info(pipelinesData);

        if (this.didWeGetAnyPipelines(pipelinesData)) {
            let pipelineId: number = this.extractPipelineId(pipelinesData, jobCiIdParts.pipelineName, logger);

            if (pipelineId == -1) {
                throw new Error('No pipeline found with the name: ' + jobCiIdParts.pipelineName);
            }

            let repositoryId = -1;
            let defaultBranch = '';

            logger.info('Requesting pipeline with id: ' + pipelineId + ' from: ' + url + ', teamProjectId: ' + teamProjectId);

            let pipeline = await this.getPipeline(url, teamProjectId, token, pipelineId);

            logger.info('Received pipeline: ');
            logger.info(pipeline);

            if (pipeline) {
                repositoryId = this.extractRepositoryId(pipeline);

                if (repositoryId) {

                    logger.info('Requesting repository with id: ' + repositoryId
                        + ' from: ' + url + ', teamProjectId: ' + teamProjectId);

                    let repository = await this.getRepository(url, teamProjectId, token, repositoryId);

                    logger.info('Received repository: ');
                    logger.info(repository);

                    if (repository) {
                        defaultBranch = repository['defaultBranch'];
                    }
                }
            }

            if (defaultBranch) {
                logger.info('The pipeline will be executed against: repository ID: '
                    + repositoryId + ', default branch: ' + defaultBranch);

                result = await this.runPipeline(url, teamProjectId, token, pipelineId, defaultBranch, logger);

                if (result.state && result.state === 'inProgress') {
                    statusCode = 201;
                } else {
                    statusCode = 500;
                }

                logger.info(result);
            } else {
                result = 'No default branch detected for the repository ID: ' + repositoryId + '. Cannot run pipeline!';
                logger.warn(result);
            }
        } else {
            result = 'No pipelines were found in the project with name: ' + teamProject;
        }

        return this.getTaskProcessorResult(task, statusCode, result);
    }

    private static async getPipelines(url: URL, teamProjectId: string, token: string): Promise<any> {
        return new Promise(function (resolve, reject) {
            const getPipelinesReq = http.get({
                host: url.hostname,
                path: url.pathname + teamProjectId + '/_apis/pipelines?' + AzureDevOpsApiVersions.API_VERSION_6_0_PREVIEW,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                }
            }, function (response) {
                let body = [];
                response.on('data', (chunk) => {
                    body.push(chunk);
                }).on('end', () => {
                    let stringBuff = Buffer.concat(body).toString();
                    resolve(JSON.parse(stringBuff));
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    private static didWeGetAnyPipelines(pipelineData: any) {
        return pipelineData != undefined && pipelineData['value'] != undefined && pipelineData['value'].length > 0;
    }

    private static getTaskProcessorResult(task: Task, statusCode: number, result: any): TaskProcessorResult {
        return new TaskProcessorResult(task, statusCode, result);
    }

    private static extractPipelineId(pipelineData: any, pipelineNameToFindIdFor: string, logger: LogUtils): number {
        let pipelinesDataValue = pipelineData['value'];
        let pipelinesCount = pipelinesDataValue.length;

        logger.info('Identified ' + pipelinesCount +
            ' pipelines in the project. Searching for the one which execution was requested');

        let pipelineId = -1;

        for (let i = 0; i < pipelinesCount; i++) {
            if (pipelinesDataValue[i].name === pipelineNameToFindIdFor) {
                pipelineId = pipelinesDataValue[i].id;
                break;
            }
        }

        return pipelineId;
    }

    private static getPipeline(url: URL, teamProjectId: string, token: string, pipelineId: number) {
        return new Promise<any>((resolve, reject) => {
            const getPipelineReq = http.get({
                host: url.hostname,
                path: url.pathname + teamProjectId + '/_apis/pipelines/' + pipelineId + '?' + AzureDevOpsApiVersions.API_VERSION_6_0_PREVIEW,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                }
            }, response => {
                let body = [];
                response.on('data', (chunk) => {
                    body.push(chunk);
                }).on('end', () => {
                    let stringBuff = Buffer.concat(body).toString();
                    resolve(JSON.parse(stringBuff));
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    private static extractRepositoryId(pipeline: any): number {
        return pipeline['configuration']['repository']['id'];
    }

    private static getRepository(url: URL, teamProjectId: string, token: string, repositoryId: number): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const getPipelineReq = http.get({
                host: url.hostname,
                path: url.pathname + teamProjectId + '/_apis/git/repositories/' + repositoryId + '?' + AzureDevOpsApiVersions.API_VERSION_6_0_PREVIEW,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                }
            }, response => {
                let body = [];
                response.on('data', (chunk) => {
                    body.push(chunk);
                }).on('end', () => {
                    let stringBuff = Buffer.concat(body).toString();
                    resolve(JSON.parse(stringBuff));
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    private static async runPipeline(url: URL, teamProjectId: string, token: string, pipelineId: number, branch: string, logger: LogUtils) {
        let result: any = '';

        let data = JSON.stringify({
            'stagesToSkip': [],
            'resources': {'repositories': {'self': {'refName': branch}}},
            'variables': {}
        });

        try {
            result = await new Promise(function (resolve, reject) {
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
                    let body = [];
                    response.on('data', (chunk) => {
                        body.push(chunk);
                    }).on('end', () => {
                        let stringBuff = Buffer.concat(body).toString();
                        resolve(JSON.parse(stringBuff));
                    });
                }).on('error', (err) => {
                    reject(err);
                });

                req.write(data);
                req.end();
            });
        } catch (ex) {
            result = ex;
        }

        return result;
    }
}

class JobCiIdParts {
    public server: string;
    public instanceId: string;
    public teamProject: string;
    public pipelineName: string;

    private constructor(server: string, instanceId: string, teamProject: string, pipelineName: string) {
        this.server = server;
        this.instanceId = instanceId;
        this.teamProject = teamProject;
        this.pipelineName = pipelineName;
    }

    public static from(jobCiId: string): JobCiIdParts {
        let sResult = jobCiId.split('.');

        if (sResult.length == 4) {
            return new JobCiIdParts(sResult[0], sResult[1], sResult[2], sResult[3]);
        } else {
            throw new Error('jobCiId(' + jobCiId + ') has wrong format!');
        }
    }
}