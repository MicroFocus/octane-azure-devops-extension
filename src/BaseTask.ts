import {CiEventsList} from './dto/events/CiEventsList';
import {CiServerInfo} from './dto/general/CiServerInfo';
import {CiEvent} from "./dto/events/CiEvent";
import {Result} from "./dto/events/CiTypes";
import {CI_SERVER_INFO} from "./ExtensionConstants";
import {LogUtils} from "./LogUtils";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {URL} from "url";

const crypto = require('crypto');
const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');
const util = require('util');
require('util.promisify').shim();

export class BaseTask {
    public static ALM_OCTANE_PIPELINE_START = 'AlmOctanePipelineStart';
    public static ALM_OCTANE_PIPELINE_END = 'AlmOctanePipelineEnd';

    private octaneServiceConnectionData: any;
    private url: URL;
    private sharedSpaceId: string;
    private workspaces: any;
    protected octaneConnections: object;
    protected tl: any;
    protected instanceId: string;
    protected collectionUri: string;
    protected projectId: string;
    protected projectName: string;
    protected jobFullName: string;
    protected buildDefinitionName: string;
    protected buildId: string;
    protected token: string;
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

    protected constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
        this.logger.debug("ALMOctaneLogLevel: " + logLevel);
        this.octaneConnections = {};
    }

    protected static generateUUID() {
        return crypto.randomBytes(15).toString('hex').replace(/(.{5})/g, '-$1').substring(1);
    }

    protected async init(agentJobName: string) {
        await new Promise<void>(async (resolve, reject) => {
            try {
                this.setAgentJobName(agentJobName);
                this.outputGlobalNodeVersion();
                this.prepareOctaneServiceConnectionData();
                this.prepareOctaneUrlAndCustomWebContext();
                this.prepareAzureToken();
                this.prepareInstanceId();
                this.validateOctaneUrlAndExtractSharedSpaceId();
                this.prepareAzureVariables();
                this.setProjectFullName();
                this.setPipelineDetails();
                this.setJobNames();
                this.prepareWorkspaces();

                this.createOctaneConnectionsAndRetrieveCiServersAndPipelines(this.getOctaneAuthentication());

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

    public async sendEvent(octaneConnection, event: CiEvent) {
        this.logger.debug('Sending event:\n' + JSON.stringify(event));
        let serverInfo = new CiServerInfo(CI_SERVER_INFO.CI_SERVER_TYPE, CI_SERVER_INFO.PLUGIN_VERSION, this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        let events = new CiEventsList(serverInfo, [event]);
        const REST_API_SHAREDSPACE_BASE_URL = this.buildEventBaseURL(octaneConnection);
        let ret = await util.promisify(octaneConnection.requestor.put.bind(octaneConnection.requestor))({
            url: '/analytics/ci/events',
            baseUrl: REST_API_SHAREDSPACE_BASE_URL,
            json: events.toJSON()
        });
        this.logger.debug('sendEvent response:');
        this.logger.debug(ret);
    }

    public async sendTestResult(octaneConnection, testResult: string) {
        //   let serverInfo = new CiServerInfo(CI_SERVER_INFO.CI_SERVER_TYPE, CI_SERVER_INFO.PLUGIN_VERSION, this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        const REST_API_SHAREDSPACE_BASE_URL = this.buildEventBaseURL(octaneConnection);
        let testResultsApiUrl = '/analytics/ci/test-results?skip-errors=true&instance-id=' + this.instanceId + '&job-ci-id=' + this.jobFullName + '&build-ci-id=' + this.buildId;
        this.logger.debug('Sending results to:' + REST_API_SHAREDSPACE_BASE_URL + '/' + testResultsApiUrl);
        this.logger.debug('The result string is: ' + testResult);
        let ret = await util.promisify(octaneConnection.requestor.post.bind(octaneConnection.requestor))({
            url: testResultsApiUrl,
            baseUrl: REST_API_SHAREDSPACE_BASE_URL,
            headers: {'Content-Type': 'application/xml'},
            json: false,
            body: testResult
        });
        this.logger.debug('sendTestResult response:');
        this.logger.debug(ret);
    }

    private buildEventBaseURL(octaneConnection): string {
        if (!!octaneConnection.config.pathPrefix) {
            return octaneConnection.config.protocol + '://' + octaneConnection.config.host + ':' + octaneConnection.config.port +
                '/' + octaneConnection.config.pathPrefix + '/' +
                'internal-api/shared_spaces/' + octaneConnection.config.shared_space_id;
        }
        return octaneConnection.config.protocol + '://' + octaneConnection.config.host + ':' + octaneConnection.config.port +
            '/internal-api/shared_spaces/' + octaneConnection.config.shared_space_id;
    }

    private setAgentJobName(agentJobName: string) {
        this.agentJobName = agentJobName;

        this.logger.info('agentJobName = ' + this.agentJobName);
        this.logger.info('agentJobNameInternalVar = ' + this.tl.getVariable('Agent.JobName'));
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

    private prepareInstanceId() {
        this.instanceId = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData,
            'instance_id', false);
        this.logger.info('instanceId = ' + this.instanceId);
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

    private getObfuscatedSecretForLogger(str: string) {
        return str.substr(0, 3) + '...' + str.substr(str.length - 3);
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
    }

    private getOctaneAuthentication(): object {
        let endpointAuth = this.tl.getEndpointAuthorization(this.octaneServiceConnectionData, false);
        let clientId = endpointAuth.parameters['username'];
        let clientSecret = endpointAuth.parameters['password'];

        this.logger.debug('clientId = ' + clientId);
        this.logger.debug('clientSecret = ' + this.getObfuscatedSecretForLogger(clientSecret));

        return {
            clientId,
            clientSecret
        }
    }

    private async createOctaneConnectionsAndRetrieveCiServersAndPipelines(octaneAuthenticationData: any) {
        let workspaces = this.workspaces.split(',');
        for (let i in workspaces) {
            let ws = workspaces[i].trim();
            await (async (ws) => {
                let connectionCandidate = this.octaneConnections[ws];
                if (!connectionCandidate) {
                    connectionCandidate = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
                        this.customWebContext, this.sharedSpaceId, ws, octaneAuthenticationData.clientId, octaneAuthenticationData.clientSecret);
                }

                let ciServer = await this.getCiServer(connectionCandidate, this.instanceId, this.projectName,
                    this.collectionUri, this.projectId, this.octaneServiceConnectionData,
                    this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);

                await this.getPipeline(connectionCandidate, this.buildDefinitionName, this.pipelineFullName, ciServer,
                    this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);

                this.octaneConnections[ws] = connectionCandidate;
            })(ws);
        }
    }

    protected async getCiServer(octaneConnection, instanceId, projectName, collectionUri, projectId, octaneService, createOnAbsence) {
        this.logger.debug('instanceId: ' + instanceId);
        let ciServerQuery = Query.field('instance_id').equal(instanceId).build();

        let ciServers = await octaneConnection.get('ci_servers').query(ciServerQuery).execute();
        this.logger.debug('ciServers: ');
        this.logger.debug(ciServers);
        let serverUrl = collectionUri + this.projectName;

        if (!ciServers || ciServers.length == 0) {
            if (!createOnAbsence) throw new Error('CI Server \'' + this.projectFullName + '(instanceId=\'' + instanceId + '\')\' not found.');
            ciServers = [
                await util.promisify(octaneConnection.ciServers.create.bind(octaneConnection.ciServers))({
                    'instance_id': instanceId,
                    'name': this.projectFullName,
                    'server_type': CI_SERVER_INFO.CI_SERVER_TYPE,
                    'url': serverUrl
                })
            ];
            if (ciServers.length === 1) {
                this.logger.info('CI server ' + ciServers[0].id + ' created');
            } else {
                this.logger.error('CI server creation failed', this.logger.getCaller());
            }
            this.tl.setVariable('ENDPOINT_DATA_' + octaneService + '_' + 'instance_id'.toUpperCase(), instanceId);
        } else {
            ciServers[0].name = this.projectFullName;
            ciServers[0].url = serverUrl;
            await util.promisify(octaneConnection.ciServers.update.bind(octaneConnection.ciServers))(ciServers[0]);
        }
        return ciServers[0];
    }

    protected async getPipeline(octaneConnection, pipelineName, rootJobName, ciServer, createOnAbsence) {
        let pipelineQuery = Query.field('name').equal(BaseTask.escapeOctaneQueryValue(pipelineName))
            .and(Query.field('ci_server').equal(Query.field('id').equal(ciServer.id)));
        let pipelines = await util.promisify(octaneConnection.pipelines.getAll.bind(octaneConnection.pipelines))({query: pipelineQuery});
        if (!pipelines || pipelines.length == 0) {
            if (!createOnAbsence) throw new Error('Pipeline \'' + pipelineName + '\' not found.');
            pipelines = [
                await util.promisify(octaneConnection.pipelines.create.bind(octaneConnection.pipelines))({
                    'name': pipelineName,
                    'ci_server': {'type': 'ci_server', 'id': ciServer.id},
                    'root_job_name': rootJobName,
                    'notification_track': false,
                    'notification_track_tester': false
                })
            ];
            if (pipelines.length === 1) {
                this.logger.info('Pipeline ' + pipelines[0].id + ' created');
            } else {
                this.logger.error('Pipeline creation failed', this.logger.getCaller());
            }
        }
        return pipelines[0];
    }

    protected static escapeOctaneQueryValue(q) {
        return q && q.replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }
}