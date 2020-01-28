import {CiEventsList} from './dto/events/CiEventsList';
import {CiServerInfo} from './dto/general/CiServerInfo';
import {CiEvent} from "./dto/events/CiEvent";
import {Result} from "./dto/events/CiTypes";
import {CI_SERVER_INFO} from "./ConstantsEnum";
import {LogUtils} from "./LogUtils";
import {Utility} from "./dto/scm/Utils";

const querystring = require('querystring');

const Octane = require('@microfocus/alm-octane-js-rest-sdk');
const getOctaneRoutes = require('./octane_routes.js');
const {URL} = require('whatwg-url');
const crypto = require('crypto');
const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');
const util = require('util');
require('util.promisify').shim();


export class BaseTask {
    public static ALM_OCTANE_PIPELINE_START = 'AlmOctanePipelineStart';
    public static ALM_OCTANE_PIPELINE_END = 'AlmOctanePipelineEnd';

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

    protected static escapeOctaneQueryValue(q) {
        return q && q.replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }


    protected async getCiServer(octaneConnection, instanceId, projectName, collectionUri, projectId, octaneService, createOnAbsence) {
        let ciServerQuery = Query.field('instance_id').equal(instanceId);
        let ciServers = await util.promisify(octaneConnection.ciServers.getAll.bind(octaneConnection.ciServers))({query: ciServerQuery});
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

    public async sendEvent(octaneConnection, event: CiEvent) {
        this.logger.debug('Sending event:\n' + JSON.stringify(event));
        let serverInfo = new CiServerInfo(CI_SERVER_INFO.CI_SERVER_TYPE, CI_SERVER_INFO.PLUGIN_VERSION, this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        let events = new CiEventsList(serverInfo, [event]);
        const REST_API_SHAREDSPACE_BASE_URL = octaneConnection.config.protocol + '://' + octaneConnection.config.host + ':' + octaneConnection.config.port + '/internal-api/shared_spaces/' + octaneConnection.config.shared_space_id;
        let ret = await util.promisify(octaneConnection.requestor.put.bind(octaneConnection.requestor))({
            url: '/analytics/ci/events',
            baseUrl: REST_API_SHAREDSPACE_BASE_URL,
            json: events.toJSON()
        });
        this.logger.debug('sendEvent response:');
        this.logger.debug(ret);
    }

    public async sendTestResult(octaneConnection, testResult: string) {
        let serverInfo = new CiServerInfo(CI_SERVER_INFO.CI_SERVER_TYPE, CI_SERVER_INFO.PLUGIN_VERSION, this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        const REST_API_SHAREDSPACE_BASE_URL = octaneConnection.config.protocol + '://' + octaneConnection.config.host + ':' + octaneConnection.config.port + '/internal-api/shared_spaces/' + octaneConnection.config.shared_space_id;
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

    protected async init() {
        await new Promise(async (resolve, reject) => {
            try {
                let result = this.tl.execSync(`node`, `--version`);
                this.logger.info('node version = ' + result.stdout);
                let octaneService = this.tl.getInput('OctaneServiceConnection', true);
                this.logger.info('OctaneService = ' + octaneService);
                let endpointUrl = this.tl.getEndpointUrl(octaneService, false);
                this.logger.debug('rawUrl = ' + endpointUrl);
                let url = new URL(endpointUrl);
                this.logger.info('url.href = ' + url.href);
                this.instanceId = this.tl.getEndpointDataParameter(octaneService, 'instance_id', false);
                this.token = this.tl.getEndpointDataParameter(octaneService, 'AZURE_PERSONAL_ACCESS_TOKEN', true);
                this.logger.debug('token = ' + this.token);
                this.logger.info('instanceId = ' + this.instanceId);
                let endpointAuth = this.tl.getEndpointAuthorization(octaneService, false);
                let clientId = endpointAuth.parameters['username'];
                let clientSecret = endpointAuth.parameters['password'];
                this.logger.debug('clientId = ' + clientId);
                this.logger.debug('clientSecret = ' + clientSecret);
                let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
                let pparam = url.searchParams.get('p');
                if (pparam === null) {
                    reject(paramsError);
                    return;
                }
                const spaces = pparam.match(/\d+/g);
                if (!spaces || spaces.length < 1) {
                    reject(paramsError);
                    return;
                }

                this.collectionUri = this.tl.getVariable('System.TeamFoundationCollectionUri');
                this.projectId = this.tl.getVariable('System.TeamProjectId');
                this.projectName = this.tl.getVariable('System.TeamProject');
                this.buildDefinitionName = this.tl.getVariable('Build.DefinitionName');
                this.buildId = this.tl.getVariable('Build.BuildId');
                this.agentJobName = this.tl.getVariable('Agent.JobName');
                this.logger.info('collectionUri = ' + this.collectionUri);
                this.logger.info('projectId = ' + this.projectId);
                this.logger.info('projectName = ' + this.projectName);
                this.logger.info('buildDefinitionName = ' + this.buildDefinitionName);
                this.logger.info('agentJobName = ' + this.agentJobName);
                this.jobStatus = this.convertJobStatus(this.tl.getVariable('AGENT_JOBSTATUS'));
                this.isPipelineStartJob = this.agentJobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase();
                this.isPipelineEndJob = this.agentJobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase();
                this.isPipelineJob = this.isPipelineStartJob || this.isPipelineEndJob;
                this.projectFullName = 'AzureDevOps.' + this.instanceId + '.' + this.projectName;
                this.logger.info('Project full name:' + this.projectFullName);
                this.jobFullName = this.projectFullName + '.' + this.buildDefinitionName + (this.isPipelineJob ? '' : '.' + this.agentJobName);
                this.logger.info('Job full name:' + this.jobFullName);
                this.rootJobFullName = this.projectFullName + '.' + this.buildDefinitionName;
                this.pipelineFullName = this.projectFullName + '.' + this.buildDefinitionName + '@@@' + this.agentJobName;
                this.logger.info('Pipeline full name:' + this.pipelineFullName);
                let workspaces = this.tl.getInput('WorkspaceList', true);
                this.logger.info('workspaces = ' + workspaces);
                workspaces = workspaces.split(',');
                for (let i in workspaces) {
                    let ws = workspaces[i];
                    await (async (ws) => {
                        let connectionCandidate = this.octaneConnections[ws];
                        if (!connectionCandidate) {
                            connectionCandidate = new Octane({
                                protocol: url.protocol.endsWith(':') ? url.protocol.slice(0, -1) : url.protocol,
                                host: url.hostname,
                                port: url.port,
                                shared_space_id: spaces[0],
                                workspace_id: ws,
                                routesConfig: getOctaneRoutes(),
                                tech_preview_API: true
                            });
                        }
                        await util.promisify(connectionCandidate.authenticate.bind(connectionCandidate))({
                            client_id: clientId,
                            client_secret: clientSecret
                        });
                        this.logger.info('Workspace ' + ws + ': authentication passed');
                        let ciServer = await this.getCiServer(connectionCandidate, this.instanceId, this.projectName, this.collectionUri, this.projectId, octaneService, this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);
                        await this.getPipeline(connectionCandidate, this.buildDefinitionName, this.pipelineFullName, ciServer, this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);
                        this.octaneConnections[ws] = connectionCandidate;
                    })(ws).then(v => v, ex => {
                        this.logger.error(ex);
                        return ex;
                    });
                }
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
}