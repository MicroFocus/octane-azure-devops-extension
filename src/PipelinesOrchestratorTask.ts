import {LogUtils} from "./LogUtils";
import {URL} from "url";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {EndpointDataConstants, SystemVariablesConstants} from "./ExtensionConstants";

let http = require('http');

export class PipelinesOrchestratorTask {
    private logger: LogUtils;

    private tl: any;
    private url: URL;
    private octaneServiceConnectionData: any;
    private customWebContext: string;
    private token: string;
    private sharedSpaceId: string;
    private analyticsCiInternalApiUrlPart: string;
    private octaneSDKConnection: any;
    private selfIdentity: string;
    private taskAsyncQueryParams: string;
    private eventObj: any;
    private maxRunTime: number;

    constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
        this.logger.debug("ALMOctaneLogLevel: " + logLevel);
    }

    public static async instance(tl: any): Promise<PipelinesOrchestratorTask> {
        let task = new PipelinesOrchestratorTask(tl);
        await task.init();

        return task;
    }

    public async run() {
        await this.runInternal();
    }

    protected async init() {
        await new Promise<void>(async (resolve, reject) => {
            try {
                this.outputGlobalNodeVersion();
                this.prepareOctaneServiceConnectionData();
                this.prepareOctaneUrlAndCustomWebContext();
                this.prepareAzureToken();
                this.validateOctaneUrlAndExtractSharedSpaceId();
                this.buildAnalyticsCiInternalApiUrlPart();
                this.prepareSelfIdentity();
                this.buildGetAbridgedTaskAsyncQueryParams();
                this.buildGetEventObject();
                this.maxRunTime = 40 * 1000; // 40 seconds

                let octaneAuthenticationData: any = this.getOctaneAuthentication();
                await this.createOctaneConnection(octaneAuthenticationData);

                resolve();
            } catch (ex) {
                reject(ex);
            }
        }).catch(ex => {
            this.logger.error(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'Pipelines Orchestrator initialization failed');

            throw ex;
        });
    }

    private async createOctaneConnection(octaneAuthenticationData: any) {
        this.octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
            this.customWebContext, this.sharedSpaceId, '500', octaneAuthenticationData.clientId, octaneAuthenticationData.clientSecret);

        await this.octaneSDKConnection._requestHandler.authenticate();

        let serverConnectivityStatusObj = await this.octaneSDKConnection._requestHandler._requestor.get(this.analyticsCiInternalApiUrlPart + '/servers/connectivity/status');

        this.logger.info('Server connectivity status:' + JSON.stringify(serverConnectivityStatusObj));
    }

    private outputGlobalNodeVersion() {
        let result = this.tl.execSync(`node`, `--version`);
        this.logger.info('node version = ' + result.stdout);
    }

    private prepareOctaneServiceConnectionData() {
        this.octaneServiceConnectionData = this.tl.getInput('OctaneServiceConnection', true);
        this.logger.info('OctaneService = ' + this.octaneServiceConnectionData);
    }

    private prepareOctaneUrlAndCustomWebContext() {
        let endpointUrl = this.tl.getEndpointUrl(this.octaneServiceConnectionData, false);
        this.url = new URL(endpointUrl);

        this.logger.info('rawUrl = ' + endpointUrl + '; url.href = ' + this.url.href);

        this.customWebContext = this.url.pathname.toString().split('/ui/')[0].substring(1);
        this.logger.info('customWebContext = ' + this.customWebContext);
    }

    private prepareAzureToken() {
        this.token = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData,
            'AZURE_PERSONAL_ACCESS_TOKEN', true);
        this.logger.debug('token = ' + this.token);
    }

    private validateOctaneUrlAndExtractSharedSpaceId() {
        let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
        let params = this.url.searchParams.get('p');
        if (params === null) {
            throw new Error(paramsError);
        }

        const spaces = params.match(/\d+/g);
        if (!spaces || spaces.length < 1) {
            throw new Error(paramsError);
        }

        this.sharedSpaceId = spaces[0];
    }

    private buildAnalyticsCiInternalApiUrlPart() {
        this.analyticsCiInternalApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/analytics/ci';
    }

    private getOctaneAuthentication(): object {
        let endpointAuth = this.tl.getEndpointAuthorization(this.octaneServiceConnectionData, true);
        let clientId = endpointAuth.parameters['username'];
        let clientSecret = endpointAuth.parameters['password'];

        this.logger.debug('clientId = ' + clientId);
        this.logger.debug('clientSecret = ' + this.getObfuscatedSecretForLogger(clientSecret));

        return {
            clientId,
            clientSecret
        }
    }

    private prepareSelfIdentity() {
        this.selfIdentity = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData, 'instance_id', false);
    }

    private getObfuscatedSecretForLogger(str: string) {
        return str.substr(0, 3) + '...' + str.substr(str.length - 3);
    }

    private buildGetAbridgedTaskAsyncQueryParams2() {
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

    private buildGetAbridgedTaskAsyncQueryParams() {
        this.taskAsyncQueryParams = "?";
        this.taskAsyncQueryParams += "self-type=" + "azure_devops";
        this.taskAsyncQueryParams += "&self-url=" + this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
        this.taskAsyncQueryParams += "&api-version=" + "1";
        this.taskAsyncQueryParams += "&sdk-version=" + "0";
        this.taskAsyncQueryParams += "&plugin-version=" + "1";
        this.taskAsyncQueryParams += "&client-id=" + "";
        this.taskAsyncQueryParams += "&ci-server-user=" + "";
    }

    private buildGetEventObject() {
        this.eventObj = {
            url: this.analyticsCiInternalApiUrlPart + '/servers/' + this.selfIdentity + "/tasks" + this.buildGetAbridgedTaskAsyncQueryParams2(),
            headers: {ACCEPT_HEADER: 'application/json'}
        };
    }

    private async runInternal() {
        await new Promise<void>((async (resolve, reject) => {
            const loopStartTime = Date.now();
            let shouldRun = true;

            while(shouldRun) {
                let response;

                try {
                    // retrieving the job, if any, from Octane
                    this.logger.info("Requesting tasks from Octane through: " + this.eventObj.url);
                    response = await this.octaneSDKConnection._requestHandler._requestor.get(this.eventObj);

                    if (response != undefined && response.length > 0) {
                        this.logger.info("Received " + response.length + " tasks to process");

                        for(let i = 0; i < response.length; i++) {
                            let taskAsString: string = JSON.stringify(response[i]);

                            this.logger.info("Processing task defined by: " + taskAsString);

                            let task: Task = this.getTask(response[i]);

                            if(task.type !== undefined) {
                                let taskProcessResult = this.getTaskProcessor(task).process(task);
                                this.logger.info("Task process result: " + taskProcessResult);

                                this.logger.info("Sending result to Octane");

                                await this.sendResponse(this.octaneSDKConnection, taskProcessResult.id, taskProcessResult.status);  // 201

                                this.logger.info("Result sent!");
                            } else {
                                this.logger.info("Unsupported task: " + taskAsString + ". Sending 400 to Octane");

                                await this.sendResponse(this.octaneSDKConnection, task.id, 400);
                            }
                        }
                    } else {
                        this.logger.info("No tasks received");
                    }
                } catch (ex) {
                    this.logger.error(ex);
                    this.tl.setResult(this.tl.TaskResult.Failed, 'PipelineInitTask should have passed but failed.');

                    reject();
                } finally {
                    shouldRun = Date.now() - loopStartTime < this.maxRunTime;

                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            resolve();
        }));
    }

    private async sendResponse(octaneSDKConnection: any, taskId: string, status: number) {
        let ackResponseObj = {
            url: this.analyticsCiInternalApiUrlPart + '/servers/' + this.selfIdentity + "/tasks/" + taskId + "/result",
            headers: {ACCEPT_HEADER: 'application/json'},
            json: true,
            body: {status: status}
        };

        let ret = await octaneSDKConnection._requestHandler._requestor.put(ackResponseObj);
        console.log(ret);
    }

    private async runPipeline(ret: any) {
        let collectionUri = this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI);
        let token = this.tl.getVariable(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);
        let teamProjectId = this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID);
        let sourceBranchName = this.tl.getVariable(SystemVariablesConstants.BUILD_SOURCE_BRANCH_NAME);
        let pipelineName = this.tl.getVariable(SystemVariablesConstants.BUILD_DEFINITION_NAME);

        let url = new URL(collectionUri);

        let p = new Promise(function(resolve, reject) {
            const getPipelinesReq = http.get({
                host: url.hostname,
                path: url.pathname + teamProjectId + '/_apis/pipelines?api-version=6.0-preview',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                }
            }, function(response) {
                if(response.statusCode == 200) {
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

        if(pipelineData != undefined && pipelineData['value'] != undefined && pipelineData['value'].length > 0) {
            let pipelineId = -1;

            for(let i = 0; i < pipelineData['value'].length; i++) {
                if(pipelineData['value'][i].name === pipelineName) {
                    pipelineId = pipelineData['value'][i].id;
                    break;
                }
            }

            if(pipelineId == -1) {
                throw new Error('No such pipeline found');
            }

            let data = JSON.stringify({'stagesToSkip':[],'resources':{'repositories':{'self':{'refName':'refs/heads/' + sourceBranchName}}},'variables':{}});

            p = new Promise(function(resolve, reject) {
                const req = http.request({
                    host: url.hostname,
                    method: 'POST',
                    path: url.pathname + teamProjectId + '/_apis/pipelines/' + pipelineId + '/runs?api-version=6.0-preview',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(token + ':', 'utf8').toString('base64'),
                        'Content-Type': 'application/json',
                        'Content-Length': data.length
                    }
                }, function(response) {
                    console.log('statusCode:' + response.statusCode);
                    console.log(response);

                    response.on('data', d => {
                        process.stdout.write(d)
                    });

                    resolve(response);
                });

                req.on('error', error => {
                    console.error(error);
                    reject(error);
                });

                req.write(data);
                req.end();
            });

            let result = await p;
            console.log(result);
        }
    }

    private getTask(taskData: any): Task {
        return undefined;
    }
}

enum TaskType {
    UNDEFINED = "",
    RUN = 'run'
};

class Task {
    public method: string;
    public id: string;
    public serviceId: string;
    public body: any;
    public url: string;
    public type: TaskType;

    constructor(method: string, id: string, serviceId: string, body: any, url: string) {
        this.method = method;
        this.id = id;
        this.serviceId = serviceId;
        this.body = body;
        this.url = url;


    }
}