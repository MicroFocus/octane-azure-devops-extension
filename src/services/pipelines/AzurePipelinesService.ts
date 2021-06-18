import {AzureDevOpsApiVersions, SystemVariablesConstants} from "../../ExtensionConstants";
import {URL} from "url";
import {Task} from "../../dto/tasks/Task";
import * as http from "http";
import {LogUtils} from "../../LogUtils";
import {TaskProcessorResult} from "../../dto/tasks/TaskProcessorResult";
import {ConnectionUtils} from "../../ConnectionUtils";

export class AzurePipelinesService {
    public static async run(task: Task, tl: any, logger: LogUtils): Promise<any> {
        let collectionUri = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
        let token = ConnectionUtils.getAccessToken(tl);
        let teamProject = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT);
        let teamProjectId = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID);
        let pipelineName = tl.getVariable(SystemVariablesConstants.BUILD_DEFINITION_NAME);

        logger.info('The pipeline name where the orchestrator task is running: ' + pipelineName);
        logger.warn('Please make sure that in this pipeline, the orchestrator job/task is the only one running!');

        let jobCiIdParts = JobCiIdParts.from(task.jobCiId);

        if (!(jobCiIdParts.teamProject === teamProject)) {  // This should not happen, ever
            let errorMsg = 'Something went wrong as the team project of the orchestrator task(' + teamProject +
                ') and the job from Octane(' + task.jobCiId + ') do not match! Cannot fulfill the request!';
            logger.error(errorMsg);

            return this.getTaskProcessorResult(task, 400, errorMsg);
        }

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

        if (this.didWeGetAnyPipelines(pipelineData)) {
            let pipelinesDataValue = pipelineData['value'];
            let pipelinesCount = pipelinesDataValue.length;

            logger.info('Identified ' + pipelinesCount +
                ' pipelines in the project. Searching for the one which execution was requested');

            let pipelineId = -1;

            for (let i = 0; i < pipelinesCount; i++) {
                if (pipelinesDataValue[i].name === jobCiIdParts.pipelineName) {
                    pipelineId = pipelinesDataValue[i].id;
                    break;
                }
            }

            if (pipelineId == -1) {
                throw new Error('No pipeline found with the name: ' + jobCiIdParts.pipelineName);
            }

            // TODO
            // 1. Get pipeline with ID, check configuration if exists, if yes retrieve the configured repository ID
            // 2. Get repository with ID, retrieve default branch

            let repositoryId = '';
            let defaultBranch = '';
            logger.info('The pipeline will be executed against: repository ID: ' + repositoryId + ', default branch: ' + defaultBranch);

            let data = JSON.stringify({
                'stagesToSkip': [],
                'resources': {'repositories': {'self': {'refName': 'refs/heads/' + defaultBranch}}},
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
                    logger.info('statusCode:' + response.statusCode);
                    logger.info(response);

                    response.on('data', d => {
                        process.stdout.write(d)
                    });

                    resolve(response);
                });

                req.on('error', error => {
                    logger.error(error);
                    reject(error);
                });

                req.write(data);
                req.end();
            });

            let result: any = await p;
            logger.info(result);

            return new TaskProcessorResult(task, result.statusCode, result);
        }

        return this.getTaskProcessorResult(task, 400, 'No pipelines were found in the project with name: ' + teamProject);
    }

    private static didWeGetAnyPipelines(pipelineData: any) {
        return pipelineData != undefined && pipelineData['value'] != undefined && pipelineData['value'].length > 0;
    }

    private static getTaskProcessorResult(task: Task, statusCode: number, result: any): TaskProcessorResult {
        return new TaskProcessorResult(task, statusCode, result);
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