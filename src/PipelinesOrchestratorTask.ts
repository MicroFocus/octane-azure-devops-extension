import {LogUtils} from "./LogUtils";
import {URL} from "url";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {InputConstants, SystemVariablesConstants} from "./ExtensionConstants";
import {Task} from "./dto/tasks/Task";
import {TaskProcessorResult} from "./dto/tasks/TaskProcessorResult";
import {TaskProcessor} from "./dto/tasks/processors/TaskProcessor";
import {TaskProcessorsFactory} from "./dto/tasks/TaskProcessorsFactory";
import {TaskProcessorContext} from "./dto/tasks/TaskProcessorContext";
import * as OrchestratorJson from "./orchestrator.json"
import {AuthenticationService} from "./services/security/AuthenticationService";
import {NodeUtils} from "./NodeUtils";
import {SharedSpaceUtils} from "./SharedSpaceUtils";
import {UrlUtils} from "./UrlUtils";

export class PipelinesOrchestratorTask {
    private readonly logger: LogUtils;
    private readonly tl: any;

    private url: URL;
    private octaneServiceConnectionData: any;
    private customWebContext: string;
    private sharedSpaceId: string;
    private analyticsCiInternalApiUrlPart: string;
    private octaneSDKConnection: any;
    private selfIdentity: string;
    private taskAsyncQueryParams: string;
    private eventObj: any;
    private elapsedSecondsAutoShutdown: number;
    private authenticationService: AuthenticationService;

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
        let startTime: Date = new Date();
        this.logger.info('Run start time: ' + startTime.toTimeString());
        this.logger.info('Auto shutdown after: ' + this.elapsedSecondsAutoShutdown + ' seconds');

        await this.runInternal();

        let endTime: Date = new Date();

        this.logger.info('Run end time: ' + endTime.toTimeString());
        this.logger.info('Total duration: ' + (endTime.getTime() - startTime.getTime()));
        this.logger.info('Shutting down...');
    }

    protected async init() {
        await new Promise<void>(async (resolve, reject) => {
            try {
                NodeUtils.outputNodeVersion(this.tl, this.logger);
                this.prepareOctaneServiceConnectionData();
                this.prepareAuthenticationService();
                this.prepareOctaneUrlAndCustomWebContext();
                this.validateOctaneUrlAndExtractSharedSpaceId();
                this.buildAnalyticsCiInternalApiUrlPart();
                this.prepareSelfIdentity();
                this.buildGetAbridgedTaskAsyncQueryParams();
                this.buildGetEventObject();
                this.elapsedSecondsAutoShutdown = OrchestratorJson["elapsed-seconds-auto-shutdown"];

                await this.createOctaneConnection();

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

    private async createOctaneConnection() {
        let clientId: string = this.authenticationService.getOctaneClientId();
        let clientSecret: string = this.authenticationService.getOctaneClientSecret();

        this.octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
            this.customWebContext, this.sharedSpaceId, '500', clientId, clientSecret);
    }

    private prepareOctaneServiceConnectionData() {
        this.octaneServiceConnectionData = this.tl.getInput(InputConstants.OCTANE_SERVICE_CONNECTION, true);
        this.logger.info('OctaneService = ' + this.octaneServiceConnectionData);
    }

    private prepareAuthenticationService() {
        this.authenticationService = new AuthenticationService(this.tl, this.octaneServiceConnectionData, this.logger);
    }

    private prepareOctaneUrlAndCustomWebContext() {
        let u = UrlUtils.getUrlAndCustomWebContext(this.octaneServiceConnectionData, this.tl, this.logger);
        this.url = u.url;
        this.customWebContext = u.customWebContext;
    }

    private validateOctaneUrlAndExtractSharedSpaceId() {
        this.sharedSpaceId = SharedSpaceUtils.validateOctaneUrlAndExtractSharedSpaceId(this.url);
    }

    private buildAnalyticsCiInternalApiUrlPart() {
        this.analyticsCiInternalApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/analytics/ci';
    }

    private prepareSelfIdentity() {
        this.selfIdentity = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData, 'instance_id', false);
    }

    private buildGetAbridgedTaskAsyncQueryParams() {
        this.taskAsyncQueryParams = "?";
        this.taskAsyncQueryParams += "self-type=" + OrchestratorJson["server-type"];
        this.taskAsyncQueryParams += "&self-url=" + encodeURIComponent(this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI));
        this.taskAsyncQueryParams += "&api-version=" + OrchestratorJson["api-version"];
        this.taskAsyncQueryParams += "&sdk-version=" + OrchestratorJson["sdk-version"];
        this.taskAsyncQueryParams += "&plugin-version=" + OrchestratorJson["plugin-version"];   // Plugin version must be same as in task.json
        this.taskAsyncQueryParams += "&client-id=" + this.authenticationService.getOctaneClientId();
        this.taskAsyncQueryParams += "&ci-server-user=" + this.authenticationService.getAzureSchemeAndAccessToken();
    }

    private buildGetEventObject() {
        this.eventObj = {
            url: this.analyticsCiInternalApiUrlPart + '/servers/' + this.selfIdentity + "/tasks" + this.taskAsyncQueryParams,
            headers: {ACCEPT_HEADER: 'application/json'}
        };
    }

    private async runInternal() {
        await this.octaneSDKConnection._requestHandler.authenticate();

        let serverConnectivityStatusObj = await this.octaneSDKConnection._requestHandler._requestor.get(
            this.analyticsCiInternalApiUrlPart + '/servers/connectivity/status');

        this.logger.info('Server connectivity status:' + JSON.stringify(serverConnectivityStatusObj));

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

                            let context = new TaskProcessorContext(this.tl, this.logger, this.authenticationService);
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
                    shouldRun = Date.now() - loopStartTime < (this.elapsedSecondsAutoShutdown * 1000);

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