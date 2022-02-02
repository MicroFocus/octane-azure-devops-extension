import {CiEventsList} from './dto/events/CiEventsList';
import {CiServerInfo} from './dto/general/CiServerInfo';
import {CiEvent} from "./dto/events/CiEvent";
import {Result} from "./dto/events/CiTypes";
import {
    CI_SERVER_INFO,
    EntityTypeConstants,
    EntityTypeRestEndpointConstants,
    InputConstants
} from "./ExtensionConstants";
import {LogUtils} from "./LogUtils";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {URL} from "url";
import {AuthenticationService} from "./services/security/AuthenticationService";
import {NodeUtils} from "./NodeUtils";
import {SharedSpaceUtils} from "./SharedSpaceUtils";
import {UrlUtils} from "./UrlUtils";

const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');

export class BaseTask {
    public static ALM_OCTANE_PIPELINE_START = 'AlmOctanePipelineStart';
    public static ALM_OCTANE_PIPELINE_END = 'AlmOctanePipelineEnd';
    public static ALM_OCTANE_PIPELINE_START_NAME = 'octanestarttask';

    protected octaneSDKConnections: object;
    protected tl: any;
    protected instanceId: string;
    protected collectionUri: string;
    protected projectId: string;
    protected projectName: string;
    protected jobFullName: string;
    protected buildDefinitionName: string;
    protected buildId: string;
    protected agentJobName: string;
    protected isPipelineStartJob: boolean;
    protected isPipelineEndJob: boolean;
    protected isPipelineJob: boolean;
    protected jobStatus: Result;
    protected logger: LogUtils;
    protected projectFullName: string;
    protected pipelineFullName: string;
    protected rootJobFullName: string;
    protected sourceBranchName: string;
    protected customWebContext: string;
    protected authenticationService: AuthenticationService;

    private octaneServiceConnectionData: any;
    private url: URL;
    private sharedSpaceId: string;
    private workspaces: any;
    private analyticsCiInternalApiUrlPart: string;

    protected constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
        this.logger.debug("ALMOctaneLogLevel: " + logLevel);
        this.octaneSDKConnections = {};
    }

    protected async init(agentJobName: string) {
        await new Promise<void>(async (resolve, reject) => {
            try {
                this.setAgentJobName(agentJobName);
                NodeUtils.outputNodeVersion(this.tl, this.logger);
                this.prepareOctaneServiceConnectionData();
                this.prepareAuthenticationService();
                this.prepareOctaneUrlAndCustomWebContext();
                this.prepareInstanceId();
                this.validateOctaneUrlAndExtractSharedSpaceId();
                this.buildAnalyticsCiInternalApiUrlPart();
                this.prepareAzureVariables();
                this.setProjectFullName();
                this.setPipelineDetails();
                this.setJobNames();
                this.prepareWorkspaces();

                await this.createOctaneConnectionsAndRetrieveCiServersAndPipelines();

                resolve();
            } catch (ex) {
                reject(ex);
            }
        }).catch(ex => {
            this.logger.error(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'PipelineInitTask should have passed but failed.');
            throw ex;
        });
    }

    public async sendEvent(octaneSDKConnection, event: CiEvent) {
        this.logger.debug('Sending event:\n' + JSON.stringify(event));

        let serverInfo = new CiServerInfo(CI_SERVER_INFO.CI_SERVER_TYPE, CI_SERVER_INFO.PLUGIN_VERSION,
            this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        let events = new CiEventsList(serverInfo, [event]);

        let eventObj = {
            url: this.analyticsCiInternalApiUrlPart +'/events',
            body: events.toJSON()
        }

        let ret = await octaneSDKConnection._requestHandler._requestor.put(eventObj);

        this.logger.debug('sendEvent response:' + ret);
    }

    public async sendTestResult(octaneSDKConnection, testResult: string) {
        let testResultsApiUrl = this.analyticsCiInternalApiUrlPart + '/test-results?skip-errors=true&instance-id=' +
            this.instanceId + '&job-ci-id=' + this.jobFullName + '&build-ci-id=' + this.buildId;

        this.logger.debug('Sending results to:' + testResultsApiUrl + '\nThe result string is:\n' + testResult);

        let testResultObj = {
            url: testResultsApiUrl,
            headers: {'Content-Type': 'application/xml'},
            json: false,
            body: testResult
        };

        let ret = await octaneSDKConnection._requestHandler._requestor.post(testResultObj);

        this.logger.debug('sendTestResult response:\n' + ret);
    }

    private buildAnalyticsCiInternalApiUrlPart() {
        this.analyticsCiInternalApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/analytics/ci';
    }

    private setAgentJobName(agentJobName: string) {
        this.agentJobName = agentJobName;

        this.logger.info('agentJobName = ' + this.agentJobName);
        this.logger.info('agentJobNameInternalVar = ' + this.tl.getVariable('Agent.JobName'));
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

    private prepareInstanceId() {
        this.instanceId = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData,
            'instance_id', false);
        this.logger.info('instanceId = ' + this.instanceId);
    }

    private validateOctaneUrlAndExtractSharedSpaceId() {
        this.sharedSpaceId = SharedSpaceUtils.validateOctaneUrlAndExtractSharedSpaceId(this.url);
    }

    private prepareAzureVariables() {
        this.collectionUri = this.tl.getVariable('System.TeamFoundationCollectionUri');
        this.projectId = this.tl.getVariable('System.TeamProjectId');
        this.projectName = this.tl.getVariable('System.TeamProject');
        this.buildDefinitionName = this.tl.getVariable('Build.DefinitionName');
        this.buildId = this.tl.getVariable('Build.BuildId');
        this.sourceBranchName = this.tl.getVariable('Build.SourceBranchName');
        this.jobStatus = this.convertJobStatus(this.tl.getVariable('AGENT_JOBSTATUS'));

        this.logger.info('collectionUri = ' + this.collectionUri);
        this.logger.info('projectId = ' + this.projectId);
        this.logger.info('projectName = ' + this.projectName);
        this.logger.info('buildDefinitionName = ' + this.buildDefinitionName);
        this.logger.info('sourceBranchName = ' + this.sourceBranchName);
    }

    protected convertJobStatus(nativeStatus: string): Result {
        switch (nativeStatus) {
            case 'Canceled':
                return Result.ABORTED;
            case 'Failed':
                return Result.FAILURE;
            case 'Succeeded':
                return Result.SUCCESS;
            case 'SucceededWithIssues':
                return Result.UNSTABLE;
            default:
                return Result.UNAVAILABLE;
        }
    }

    private setProjectFullName() {
        this.projectFullName = 'AzureDevOps.' + this.instanceId + '.' + this.projectName;
        this.logger.info('Project full name:' + this.projectFullName);
    }

    private setPipelineDetails() {
        this.isPipelineStartJob = this.agentJobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase();
        this.isPipelineEndJob = this.agentJobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase();
        this.isPipelineJob = this.isPipelineStartJob || this.isPipelineEndJob;
        this.pipelineFullName = this.projectFullName + '.' + this.buildDefinitionName + '@@@' + this.agentJobName;

        this.logger.info('Pipeline full name:' + this.pipelineFullName);
    }

    private setJobNames() {
        this.jobFullName = this.projectFullName + '.' + this.buildDefinitionName + (this.isPipelineJob ? '' : '.' + this.agentJobName);
        this.rootJobFullName = this.projectFullName + '.' + this.buildDefinitionName;

        this.logger.info('Job full name:' + this.jobFullName);
        this.logger.info('Root job full name:' + this.rootJobFullName);
    }

    private prepareWorkspaces() {
        this.workspaces = this.tl.getInput('WorkspaceList', true);

        this.logger.info('workspaces = ' + this.workspaces);

        this.workspaces = this.workspaces.split(',').map(s => s.trim());
    }

    private async createOctaneConnectionsAndRetrieveCiServersAndPipelines() {
        let clientId: string = this.authenticationService.getOctaneClientId();
        let clientSecret: string = this.authenticationService.getOctaneClientSecret();

        for (let i in this.workspaces) {
            let ws = this.workspaces[i];
            await (async (ws) => {
                let octaneSDKConnection = this.octaneSDKConnections[ws];
                if (!octaneSDKConnection) {
                    octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
                        this.customWebContext, this.sharedSpaceId, ws, clientId, clientSecret);

                    await octaneSDKConnection._requestHandler.authenticate();
                }

                let ciServer = await this.getCiServer(octaneSDKConnection, this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);

                await this.getPipeline(octaneSDKConnection, this.buildDefinitionName, this.pipelineFullName, ciServer,
                    this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);

                this.octaneSDKConnections[ws] = octaneSDKConnection;
            })(ws);
        }
    }

    protected async getCiServer(octaneSDKConnection, createOnAbsence) {
        let ciServerQuery = Query.field('instance_id').equal(this.instanceId).build();

        let ciServers;
        try {
            ciServers = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.CI_SERVERS_REST_API_NAME).query(ciServerQuery).execute();
        } catch(ex) {
            this.logger.debug(ex);
        }

        if(ciServers && ciServers.total_count > 0) {
            ciServers.data.forEach((server) => {
                this.logger.debug('CI Server: ' + JSON.stringify(server));
            });
        } else {
            this.logger.debug('No CI Servers were returned');
        }

        let serverUrl = this.collectionUri + this.projectName;

        if (!ciServers || ciServers.total_count == 0 || ciServers.data.length == 0) {
            if (createOnAbsence) {
                let result = await this.createCiServer(octaneSDKConnection, serverUrl);
                return result[0].data[0];
            } else {
                throw new Error('CI Server \'' + this.projectFullName + '(instanceId=\'' + this.instanceId + '\')\' not found.');
            }
        } else {
            let ciServer = {
                'name': this.projectFullName,
                'url': serverUrl,
                'id': ciServers.data[0].id
            }

            this.logger.debug('Updating ci server with id: ' + ciServer.id);

            await octaneSDKConnection.update(EntityTypeRestEndpointConstants.CI_SERVERS_REST_API_NAME, ciServer).execute();
        }

        return ciServers.data[0];
    }

    private async createCiServer(octaneSDKConnection, serverUrl) {
        let ci_server = {
            'name': this.projectFullName,
            'instance_id': this.instanceId,
            'server_type': CI_SERVER_INFO.CI_SERVER_TYPE,
            'url': serverUrl
        };

        let ciServers = [
            await octaneSDKConnection.create(EntityTypeRestEndpointConstants.CI_SERVERS_REST_API_NAME, ci_server).execute()
        ];

        if (ciServers.length === 1) {
            this.logger.info('CI server ' + ciServers[0].data[0].id + ' created');
        } else {
            this.logger.error('CI server creation failed', this.logger.getCaller());
        }

        this.tl.setVariable('ENDPOINT_DATA_' + this.octaneServiceConnectionData + '_' + 'instance_id'.toUpperCase(), this.instanceId);

        return ciServers;
    }

    protected async getPipeline(octaneSDKConnection, pipelineName, rootJobName, ciServer, createOnAbsence) {
        let pipelineQuery = Query.field('name').equal(BaseTask.escapeOctaneQueryValue(pipelineName))
            .and(Query.field(EntityTypeConstants.CI_SERVER_ENTITY_TYPE).equal(Query.field('id').equal(ciServer.id))).build();

        let pipelines = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.PIPELINES_REST_API_NAME).query(pipelineQuery).execute();
        if (!pipelines || pipelines.total_count == 0 || pipelines.data.length == 0) {
            if (createOnAbsence) {
                let result = await this.createPipeline(octaneSDKConnection, pipelineName, rootJobName, ciServer);
                return result[0].data[0];
            } else {
                throw new Error('Pipeline \'' + pipelineName + '\' not found.')
            }
        }

        return pipelines.data[0];
    }

    private async createPipeline(octaneSDKConnection, pipelineName, rootJobName, ciServer) {
        let pipeline = {
            'name': pipelineName,
            'ci_server': {'type': EntityTypeConstants.CI_SERVER_ENTITY_TYPE, 'id': ciServer.id},
            'root_job_name': rootJobName,
            'notification_track': false,
            'notification_track_tester': false
        };

        let pipelines = [
            await octaneSDKConnection.create(EntityTypeRestEndpointConstants.PIPELINES_REST_API_NAME, pipeline).execute()
        ];

        if (pipelines.length === 1) {
            this.logger.info('Pipeline ' + pipelines[0].data[0].id + ' created');
        } else {
            this.logger.error('Pipeline creation failed', this.logger.getCaller());
        }

        return pipelines;
    }

    protected static escapeOctaneQueryValue(q) {
        return q && q.replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }
}