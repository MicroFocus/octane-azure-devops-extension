import {LogUtils} from "./LogUtils";
import {URL} from "url";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {SystemVariablesConstants} from "./ExtensionConstants";
import {Task} from "./dto/tasks/Task";
import {TaskProcessorResult} from "./dto/tasks/TaskProcessorResult";
import {TaskProcessor} from "./dto/tasks/processors/TaskProcessor";
import {TaskProcessorsFactory} from "./dto/tasks/TaskProcessorsFactory";
import {TaskProcessorContext} from "./dto/tasks/TaskProcessorContext";
import * as OrchestratorJson from "./orchestrator.json"

export class PipelinesOrchestratorTask {
    private readonly logger: LogUtils;
    private readonly tl: any;

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

    private buildGetAbridgedTaskAsyncQueryParams() {
        this.taskAsyncQueryParams = "?";
        this.taskAsyncQueryParams += "self-type=" + "azure_devops";
        this.taskAsyncQueryParams += "&self-url=" + encodeURIComponent(this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI));
        this.taskAsyncQueryParams += "&api-version=" + OrchestratorJson["api-version"];
        this.taskAsyncQueryParams += "&sdk-version=" + OrchestratorJson["sdk-version"];
        this.taskAsyncQueryParams += "&plugin-version=" + OrchestratorJson["plugin-version"];   // Plugin version must be same as in task.json
        this.taskAsyncQueryParams += "&client-id=" + "";
        this.taskAsyncQueryParams += "&ci-server-user=" + "";
    }

    private buildGetEventObject() {
        this.eventObj = {
            url: this.analyticsCiInternalApiUrlPart + '/servers/' + this.selfIdentity + "/tasks" + this.taskAsyncQueryParams,
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

                    if (this.areThereAnyTasksToProcess(response)) {
                        this.logger.info("Received " + response.length + " tasks to process");

                        for(let i = 0; i < response.length; i++) {
                            let taskAsString: string = JSON.stringify(response[i]);

                            this.logger.info("Processing task defined by: " + taskAsString);

                            let task: Task = Task.from(response[i], this.logger);

                            let context = new TaskProcessorContext(this.tl, this.logger);
                            let processor: TaskProcessor = TaskProcessorsFactory.getTaskProcessor(task, context);
                            let processorResult: TaskProcessorResult = await processor.process(task);

                            this.logger.info('Sending task:' + processorResult.task.id + ' status ' + processorResult.status + ' to Octane');
                            await this.sendResponse(this.octaneSDKConnection, processorResult.task.id, processorResult.status);
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

                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            resolve();
        }));
    }

    private areThereAnyTasksToProcess(response) {
        return response != undefined && response.length > 0;
    }

    private async sendResponse(octaneSDKConnection: any, taskId: string, status: number) {
        let ackResponseObj = {
            url: this.analyticsCiInternalApiUrlPart + '/servers/' + this.selfIdentity + "/tasks/" + taskId + "/result",
            headers: {ACCEPT_HEADER: 'application/json'},
            json: true,
            body: {status: status}
        };

        let ret = await octaneSDKConnection._requestHandler._requestor.put(ackResponseObj);
        this.logger.info('Octane response from receiving task status: ' + ret);
    }
}