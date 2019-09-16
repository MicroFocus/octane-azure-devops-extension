import {CiEventsList} from './dto/events/CiEventsList';
import {CiServerInfo} from './dto/general/CiServerInfo';
import {CiEvent} from "./dto/events/CiEvent";
import {Result} from "./dto/events/CiTypes";

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

    protected octane: any;
    protected tl: any;
    protected serverInfo: CiServerInfo;
    protected instanceId: string;
    protected collectionUri: string;
    protected projectId: string;
    protected projectName: string;
    protected buildName: string;
    protected buildId: string;
    protected token: string;
    protected jobName: string;
    protected isPipelineStartJob: boolean;
    protected isPipelineEndJob: boolean;
    protected isPipelineJob: boolean;
    protected fullProjectName: string;
    protected jobStatus: Result;

    protected constructor(tl: any) {
        this.tl = tl;
    }

    protected static generateUUID() {
        return crypto.randomBytes(15).toString('hex').replace(/(.{5})/g, '-$1').substring(1);
    }

    protected static escapeOctaneQueryValue(q) {
        return q && q.replace(/\\/g, '\\\\');
    }


    protected async getCiServer(instanceId, serverName, collectionUri, projectId, octaneService, createOnAbsence) {
        let ciServerQuery = Query.field('instance_id').equal(instanceId);
        let ciServers = await util.promisify(this.octane.ciServers.getAll.bind(this.octane.ciServers))({query: ciServerQuery});
        console.log(ciServers);
        let serverUrl = collectionUri + this.projectName;
        let pluginVersion = '0.1.1';
        if (!ciServers || ciServers.length == 0) {
            if(!createOnAbsence) throw new Error('CI Server \'' + serverName +'(instanceId=\'' + instanceId + '\')\' not found.');
            ciServers = [
                await util.promisify(this.octane.ciServers.create.bind(this.octane.ciServers))({
                    'instance_id': instanceId && instanceId.trim() || BaseTask.generateUUID(),
                    'name': serverName,
                    'server_type': 'azure_devops',
                    'url': serverUrl,
                    'plugin_version': pluginVersion
                })
            ];
            console.log(ciServers.length === 1 ? 'CI server ' + ciServers[0].id + ' created' : 'CI server creation failed');
            this.tl.setVariable('ENDPOINT_DATA_' + octaneService + '_' + 'instance_id'.toUpperCase(), instanceId);
        } else {
            ciServers[0].name = serverName;
            ciServers[0].url = serverUrl;
            ciServers[0].plugin_version = pluginVersion;
            await util.promisify(this.octane.ciServers.update.bind(this.octane.ciServers))(ciServers[0]);
        }
        return ciServers[0];
    }

    protected async getPipeline(pipelineName, rootJobName, ciServer, createOnAbsence) {
        let pipelineQuery = Query.field('name').equal(BaseTask.escapeOctaneQueryValue(pipelineName));
        let pipelines = await util.promisify(this.octane.pipelines.getAll.bind(this.octane.pipelines))({query: pipelineQuery});
        if (!pipelines || pipelines.length == 0) {
            if(!createOnAbsence) throw new Error('Pipeline \'' + pipelineName +'\' not found.');
            pipelines = [
                await util.promisify(this.octane.pipelines.create.bind(this.octane.pipelines))({
                    'name': pipelineName,
                    'ci_server': {'type': 'ci_server', 'id': ciServer.id},
                    'root_job_name': rootJobName,
                    'notification_track': false,
                    'notification_track_tester': false
                })
            ];
            console.log(pipelines.length === 1 ? 'Pipeline ' + pipelines[0].id + ' created' : 'Pipeline creation failed');
        }
        return pipelines[0];
    }

    public async sendEvent(event: CiEvent) {
        let serverInfo = new CiServerInfo('azure_devops', '2.0.1', this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        let events = new CiEventsList(serverInfo, [event]);
        const REST_API_SHAREDSPACE_BASE_URL = this.octane.config.protocol + '://' + this.octane.config.host + ':' + this.octane.config.port + '/internal-api/shared_spaces/' + this.octane.config.shared_space_id;
        let ret = await util.promisify(this.octane.requestor.put.bind(this.octane.requestor))({
            url: '/analytics/ci/events',
            baseUrl: REST_API_SHAREDSPACE_BASE_URL,
            json: events.toJSON()
        });
        console.log(ret);
    }

    public async sendTestResult(testResult: string) {
        let serverInfo = new CiServerInfo('azure_devops', '2.0.1', this.collectionUri + this.projectId, this.instanceId, null, new Date().getTime());
        const REST_API_SHAREDSPACE_BASE_URL = this.octane.config.protocol + '://' + this.octane.config.host + ':' + this.octane.config.port + '/internal-api/shared_spaces/' + this.octane.config.shared_space_id;
        await util.promisify(this.octane.requestor.post.bind(this.octane.requestor))({
            url: '/analytics/ci/test-results?skip-errors=true&instance-id=' + this.instanceId + '&job-ci-id=' + this.fullProjectName + '&build-ci-id=' + this.buildId,
            baseUrl: REST_API_SHAREDSPACE_BASE_URL,
            headers: {'Content-Type': 'application/xml'},
            json: false,
            body: testResult
        });
    }

    protected async init() {
        await new Promise(async (resolve, reject) => {
            try {
                let result = this.tl.execSync(`node`, `--version`);
                console.log('node version = ' + result.stdout);
                let octaneService = this.tl.getInput('OctaneServiceConnection', true);
                console.log('OctaneService = ' + octaneService);
                let endpointUrl = this.tl.getEndpointUrl(octaneService, false);
                console.log('rawUrl = ' + endpointUrl);
                let url = new URL(endpointUrl);
                console.log('url.href = ' + url.href);
                this.instanceId = this.tl.getEndpointDataParameter(octaneService, 'instance_id', true);
                this.token = this.tl.getEndpointDataParameter(octaneService, 'AZURE_PERSONAL_ACCESS_TOKEN', true);
                console.log('token = ' + this.token);
                console.log('instanceId = ' + this.instanceId);
                let endpointAuth = this.tl.getEndpointAuthorization(octaneService, false);
                let clientId = endpointAuth.parameters['username'];
                let clientSecret = endpointAuth.parameters['password'];
                console.log('clientId = ' + clientId);
                console.log('clientSecret = ' + clientSecret);
                let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
                let pparam = url.searchParams.get('p');
                if (pparam === null) {
                    reject(paramsError);
                    return;
                }
                const spaces = pparam.match(/\d+/g);
                if (!spaces || spaces.length < 2) {
                    reject(paramsError);
                    return;
                }

                this.collectionUri = this.tl.getVariable('System.TeamFoundationCollectionUri');
                this.projectId = this.tl.getVariable('System.TeamProjectId');
                this.projectName = this.tl.getVariable('System.TeamProject');
                this.buildName = this.tl.getVariable('Build.DefinitionName');
                this.buildId = this.tl.getVariable('Build.BuildId');
                console.log('collectionUri = ' + this.collectionUri);
                console.log('projectId = ' + this.projectId);
                console.log('projectName = ' + this.projectName);
                console.log('buildName = ' + this.buildName);
                if (!this.octane) {
                    this.octane = new Octane({
                        protocol: url.protocol.endsWith(':') ? url.protocol.slice(0, -1) : url.protocol,
                        host: url.hostname,
                        port: url.port,
                        shared_space_id: spaces[0],
                        workspace_id: spaces[1],
                        routesConfig: getOctaneRoutes(),
                        tech_preview_API: true
                    });
                }
                this.jobName = this.tl.getVariable('Agent.JobName');
                this.jobStatus = this.convertJobStatus(this.tl.getVariable('AGENT_JOBSTATUS'));
                this.isPipelineStartJob = this.jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase();
                this.isPipelineEndJob = this.jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase();
                this.isPipelineJob = this.isPipelineStartJob || this.isPipelineEndJob;
                this.fullProjectName = this.projectName + (this.isPipelineJob ? '' : '.' + this.jobName);

                await util.promisify(this.octane.authenticate.bind(this.octane))({
                    client_id: clientId,
                    client_secret: clientSecret
                });

                console.log('Connected');

                this.instanceId = this.instanceId && this.instanceId.trim() || BaseTask.generateUUID();
                console.log('instanceId=' + this.instanceId);

                let jobName = this.tl.getVariable('Agent.JobName');

                let ciServer = await this.getCiServer(this.instanceId, this.projectName, this.collectionUri, this.projectId, octaneService, jobName === BaseTask.ALM_OCTANE_PIPELINE_START);
                let rootJobName = this.projectName + '_' + this.buildName;
                let pipeline = await this.getPipeline(this.buildName, rootJobName, ciServer, jobName === BaseTask.ALM_OCTANE_PIPELINE_START);
                resolve();
            } catch (ex) {
                reject(ex);
            }
        }).catch(ex => {
            console.log(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'PipelineInitTask should have passed but failed.');
        });
    }

    protected convertJobStatus(nativeStatus: string) : Result {
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