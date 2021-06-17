import {EndpointDataConstants, SystemVariablesConstants} from "../../ExtensionConstants";
import {URL} from "url";
import {Task} from "../../dto/tasks/Task";
import * as http from "http";
import {LogUtils} from "../../LogUtils";
import {TaskProcessorResult} from "../../dto/tasks/TaskProcessorResult";

export class AzurePipelinesService {
    public static async run(task: Task, tl: any, logger: LogUtils): Promise<any> {
        let collectionUri = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
        let token = tl.getVariable(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);
        let teamProjectId = tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID);
        let sourceBranchName = tl.getVariable(SystemVariablesConstants.BUILD_SOURCE_BRANCH_NAME);
        let pipelineName = tl.getVariable(SystemVariablesConstants.BUILD_DEFINITION_NAME);

        let url = new URL(collectionUri);

        let p = new Promise(function (resolve, reject) {
            const getPipelinesReq = http.get({
                host: url.hostname,
                path: url.pathname + teamProjectId + '/_apis/pipelines?api-version=6.0-preview',
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
                    path: url.pathname + teamProjectId + '/_apis/pipelines/' + pipelineId + '/runs?api-version=6.0-preview',
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
    }
}