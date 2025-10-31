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
import {CiEventsList} from './dto/events/CiEventsList';
import {CiServerInfo} from './dto/general/CiServerInfo';
import {CiEvent} from "./dto/events/CiEvent";
import {Result} from "./dto/events/CiTypes";
import {
    CI_SERVER_INFO,
    EntityTypeConstants,
    EntityTypeRestEndpointConstants,
    InputConstants, OctaneVariablesName
} from "./ExtensionConstants";
import {LogUtils} from "./LogUtils";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {URL} from "url";
import {AuthenticationService} from "./services/security/AuthenticationService";
import {NodeUtils} from "./NodeUtils";
import {SharedSpaceUtils} from "./SharedSpaceUtils";
import {UrlUtils} from "./UrlUtils";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {PipelineParametersService} from "./services/pipelines/PipelineParametersService";

import {Octane, Query} from '@microfocus/alm-octane-js-rest-sdk';
import * as ba from "azure-devops-node-api/BuildApi";
import {FeatureToggleService} from "./services/octane/FeatureToggleService";

export class BaseTask {
    public static ALM_OCTANE_PIPELINE_START = 'AlmOctanePipelineStart';
    public static ALM_OCTANE_TEST_RUNNER_START = 'AlmOctaneTestRunnerStart';
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
    protected featureToggleService: FeatureToggleService;
    protected definitionId: number;
    protected sourceBranch: string;
    protected createPipelineRequired: boolean;

    private octaneServiceConnectionData: any;
    protected url: URL;
    protected sharedSpaceId: string;
    protected workspaces: any;
    private analyticsCiInternalApiUrlPart: string;
    private ciInternalAzureApiUrlPart: string;
    protected experiments: {[name:string]: boolean} = {};
    protected parametersService: PipelineParametersService;

    private octanePipelineName: string;
    private useFullPipelinePath:string;

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
                this.prepareParametersService();
                this.prepareCreatePipelineRequired();

                await this.populateOctaneConnections();
                await this.prepareFeatureToggleService();
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

        let ret = await octaneSDKConnection.executeCustomRequest(this.analyticsCiInternalApiUrlPart + '/events',
            Octane.operationTypes.update, events.toJSON());
        this.logger.debug('sendEvent response:' + ret?.status);
    }

    public async sendTestResult(octaneSDKConnection, testResult: string) {
        let testResultsApiUrl = this.analyticsCiInternalApiUrlPart + '/test-results?skip-errors=true&instance-id=' +
        this.instanceId + '&job-ci-id=' + this.getJobCiId() + '&build-ci-id=' + this.buildId;

        this.logger.debug('Sending results to:' + testResultsApiUrl + '\nThe result string is:\n' + testResult);

        const options = {
            headers: {'Content-Type': 'application/xml'},
            json: false,
        }

        let ret = await octaneSDKConnection.executeCustomRequest(testResultsApiUrl,
            Octane.operationTypes.create, testResult, options.headers);

        this.logger.debug('sendTestResult response:' + ret.status + ', result: ' + ret.result);
    }

    private buildAnalyticsCiInternalApiUrlPart() {
        this.analyticsCiInternalApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/analytics/ci';
        this.ciInternalAzureApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/workspaces/{workspace_id}/analytics/ci';
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

    private async prepareFeatureToggleService() {
        const octaneVersion = await this.getOctaneVersion(this.octaneSDKConnections[this.workspaces[0]]);
        this.featureToggleService = await FeatureToggleService.getInstance(this.tl, this.logger, this.sharedSpaceId, this.workspaces[0], this.octaneSDKConnections[this.workspaces[0]], octaneVersion);
    }

    private async populateOctaneConnections(): Promise<void> {
        const clientId = this.authenticationService.getOctaneClientId();
        const clientSecret = this.authenticationService.getOctaneClientSecret();

        for (const workspace of this.workspaces) {
            if (this.octaneSDKConnections[workspace]) {
                continue;
            }
            const connection = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
                                                                                    this.customWebContext,
                                                                                    this.sharedSpaceId,
                                                                                    workspace,
                                                                                    clientId,
                                                                                    clientSecret);
            await connection._requestHandler.authenticate();
            this.octaneSDKConnections[workspace] = connection;
        }
    }

    private prepareParametersService() {
        this.parametersService = new PipelineParametersService(this.tl, this.logger);
    }

    private prepareCreatePipelineRequired() {
        if (this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START) {
            this.createPipelineRequired = this.tl.getInput('CreatePipelineCheckbox', true).toLowerCase() === 'true';
        }
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

    protected prepareAzureVariables() {
        this.collectionUri = this.tl.getVariable('System.TeamFoundationCollectionUri');
        this.projectId = this.tl.getVariable('System.TeamProjectId');
        this.projectName = this.tl.getVariable('System.TeamProject');
        this.buildDefinitionName = this.tl.getVariable('Build.DefinitionName');
        this.buildId = this.tl.getVariable('Build.BuildId');
        this.sourceBranchName = this.tl.getVariable('Build.SourceBranchName');
        this.jobStatus = this.convertJobStatus(this.tl.getVariable('AGENT_JOBSTATUS'));
        this.definitionId = this.tl.getVariable("System.DefinitionId");
        this.sourceBranch = this.tl.getVariable("Build.SourceBranch");

        this.logger.info('collectionUri = ' + this.collectionUri);
        this.logger.info('projectId = ' + this.projectId);
        this.logger.info('projectName = ' + this.projectName);
        this.logger.info('buildDefinitionName = ' + this.buildDefinitionName);
        this.logger.info('sourceBranchName = ' + this.sourceBranchName);
        this.logger.info('definitionId = ' + this.definitionId);
        this.logger.info('sourceBranch = ' + this.sourceBranch);
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
        this.octanePipelineName = this.tl.getInput(InputConstants.PIPELINE_NAME,false);
        this.useFullPipelinePath = this.tl.getInput(InputConstants.IS_FULL_PATHNAME,false);

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

    protected async initializeExperiments(octaneSDKConnection,ws):Promise<void>{
        const currentVersion = await this.getOctaneVersion(octaneSDKConnection);
        this.logger.info("Octane current version: " + currentVersion);

        await this.updatePluginVersion(octaneSDKConnection);
        this.logger.info("Send plugin details to Octane.");

        const azureTestingFrameworkSupportedVersion = '16.2.31';
        if(this.agentJobName === BaseTask.ALM_OCTANE_TEST_RUNNER_START &&
            !OctaneConnectionUtils.isVersionGreaterOrEquals(currentVersion,azureTestingFrameworkSupportedVersion)) {

            throw new Error('Azure testing framework is not supported for Octane version less than ' + azureTestingFrameworkSupportedVersion +
                '. Current Octane version is :' + currentVersion);
        }
    }

    protected async createOctaneConnectionsAndRetrieveCiServersAndPipelines() {
        for (let i in this.workspaces) {
            let ws = this.workspaces[i];
            await (async (ws) => {
                let octaneSDKConnection = this.octaneSDKConnections[ws];
                await this.initializeExperiments(octaneSDKConnection,ws);
                if(this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START) {
                    let ciServer = await this.getCiServer(octaneSDKConnection, this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START);
                    if (this.createPipelineRequired || !await this.doesOctaneSupportCreatingCIJobsDirectly(octaneSDKConnection)) {

                        await this.getPipeline(octaneSDKConnection, this.buildDefinitionName, this.pipelineFullName, ciServer, ws);
                    } else {
                        await this.getCiJob(octaneSDKConnection, this.buildDefinitionName, ciServer);
                    }
                }

                await this.additionalConfig(octaneSDKConnection, ws);
            })(ws);
        }
    }

    // For test runner task config (to avoid code duplication)
    protected async additionalConfig(octaneSDKConnection, ws) {
        // Do nothing
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
        }

        return ciServers.data[0];
    }

    private async createCiServer(octaneSDKConnection, serverUrl) {
        let ci_server = {
            'name': this.projectFullName,
            'instance_id': this.instanceId,
            'server_type': CI_SERVER_INFO.CI_SERVER_TYPE,
            'url': encodeURI(serverUrl),
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

    protected getJobCiId(){
        return this.projectId + '.'+this.definitionId +'.' +this.sourceBranchName;
    }

    protected getParentJobCiId(){
        return  this.projectId + '.' + this.definitionId;
    }

    protected async getPipeline(octaneSDKConnection, pipelineName, rootJobName, ciServer, workspaceId) {
        let pipelines;
            await this.upgradePipelinesIfNeeded(octaneSDKConnection,ciServer,workspaceId);

            const pipelineQuery = Query.field('ci_id').equal(BaseTask.escapeOctaneQueryValue(this.getParentJobCiId()))
                .and(Query.field(EntityTypeConstants.CI_SERVER_ENTITY_TYPE).equal(Query.field('id').equal(ciServer.id))).build();

            const ciJobs = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME)
                .fields('pipeline,definition_id,name')
                .query(pipelineQuery).execute();

            if(ciJobs && ciJobs.total_count > 0 && ciJobs.data) {
                pipelines = ciJobs.data.filter(ciJob => ciJob.pipeline).map(ciJob => ciJob.pipeline);
            }
            if (!pipelines || pipelines.length == 0) {
                rootJobName = rootJobName + '@@@' + this.definitionId + '@@@' + this.sourceBranch;
                pipelineName = await this.getPipelineName(pipelineName);
                let result = await this.createPipeline(octaneSDKConnection, workspaceId, pipelineName, rootJobName, ciServer);
                return result[0].data[0];
            } else {
                this.logger.debug('Checking if have CI jobs to update Octane');
                //update the CI job with definition-id if the field not exist
                const ciJobsToUpdate = ciJobs.data.filter(ciJob => ciJob.pipeline && ciJob?.definition_id !== this.definitionId);
                if(ciJobsToUpdate?.length > 0) {
                    this.logger.info('Updating ' + ciJobsToUpdate.length +' CI jobs of Octane');
                    await this.updateExistCIJobs(ciJobsToUpdate,ciServer.id,workspaceId,octaneSDKConnection);
                } else {
                    this.logger.info('check if need to update ci job name');
                    await this.updateExistCiJobNameIfNeeded(ciJobs.data,workspaceId,ciServer.id,octaneSDKConnection);
                }
            }
            return pipelines[0];
    }

    private async getPipelineName(pipelineName:string):Promise<string>{
        if(!this.useFullPipelinePath || this.useFullPipelinePath?.toLowerCase() === 'false'){
            return this.octanePipelineName || pipelineName;
        }
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        let buildApi: ba.IBuildApi = await api.getBuildApi();
        let build_info = await buildApi.getBuild(this.projectName, parseInt(this.buildId));
        let pipelineNameForCreate = build_info?.definition?.path && build_info?.definition.path !== '\\' ? build_info.project.name +  build_info.definition.path + '\\' + pipelineName : build_info.project.name + '\\' + pipelineName;
        if(pipelineNameForCreate.startsWith('\\')){
            pipelineNameForCreate = pipelineNameForCreate.substring(1);
        }
        if(pipelineNameForCreate.indexOf('\\') > 0) {
            return pipelineNameForCreate.replaceAll('\\','/');
        }
        return pipelineNameForCreate;
    }

    protected async getCiJob(octaneSDKConnection, rootJobName, ciServer) {
        const ciJobQuery = Query.field('ci_id').equal(BaseTask.escapeOctaneQueryValue(this.getParentJobCiId()))
            .and(Query.field(EntityTypeConstants.CI_SERVER_ENTITY_TYPE).equal(Query.field('id').equal(ciServer.id))).build();
        const ciJobs = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME)
            .fields('definition_id').query(ciJobQuery).execute();

        if (ciJobs && ciJobs.total_count > 0 && ciJobs.data) {
            return ciJobs[0];
        } else {
            return await this.createCiJob(octaneSDKConnection, ciServer);
        }
    }

    private async getOctaneVersion(octaneSDKConnection): Promise<string>{
        const octaneVersionVariable = this.tl.getVariable(OctaneVariablesName.OCTANE_VERSION);
        this.logger.info('Octane version variable value: ' + (octaneVersionVariable ? octaneVersionVariable : 'not exist'));
        if(!octaneVersionVariable) {
            const urlStatus = this.analyticsCiInternalApiUrlPart + '/servers/connectivity/status'
            const response = await octaneSDKConnection.executeCustomRequest(urlStatus, Octane.operationTypes.get);
            this.logger.debug("Octane connectivity status response: " + JSON.stringify(response.octaneVersion));
            this.tl.setVariable('ALMOctaneVersion',response.octaneVersion);
            return response.octaneVersion;
        }
        return octaneVersionVariable;

    }

    private async updatePluginVersion(octaneSDKConnection): Promise<void>{
        const querystring = require('querystring');
        const sdk = "";
        const plugin = await this.getPluginVersion();
        const client_id = this.authenticationService.getOctaneClientId();
        const self_url = querystring.escape(this.collectionUri + this.projectName);
        const instance_id = this.instanceId;

        const urlConnectivity = this.analyticsCiInternalApiUrlPart +
           `/servers/${instance_id}/tasks?self-type=azure_devops&api-version=1&sdk-version=${sdk}&plugin-version=${plugin}&self-url=${self_url}&client-id=${client_id}&client-server-user=`;
        await octaneSDKConnection.executeCustomRequest(urlConnectivity, Octane.operationTypes.get);
    }

    private async getPluginVersion():Promise<string>{
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        const extApi = await api.getExtensionManagementApi(this.collectionUri)
        const extension = await extApi.getInstalledExtensionByName("almoctane","alm-octane-integration-public");
        this.logger.debug("Extension query result: " + JSON.stringify(extension));
        this.logger.info("extension version: " + extension?.version);
        return extension?.version ? extension.version : "";
    }

    protected async upgradePipelinesIfNeeded(octaneSDKConnection, ciServer, workspaceId) {
        //check if the parent exists in old format of ci_id:
        const pipelineQuery = Query.field('ci_id').equal(BaseTask.escapeOctaneQueryValue(this.projectFullName + '.' + this.buildDefinitionName))
            .and(Query.field(EntityTypeConstants.CI_SERVER_ENTITY_TYPE).equal(Query.field('id').equal(ciServer.id))).build();
        const ciJobs = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME)
            .fields('pipeline,definition_id')
            .query(pipelineQuery).execute();

        //if yes - should upgrade the parent
        if (ciJobs && ciJobs.total_count > 0 && ciJobs.data) {
            //should update the ciJobs with new id.
            this.logger.info("start upgrade of ciJob and his pipelines");
            await this.updateExistCIJobs(ciJobs.data, ciServer.id, workspaceId, octaneSDKConnection);

            let pipelines = ciJobs.data.filter(ciJob => ciJob.pipeline).map(ciJob => ciJob.pipeline);

            if (pipelines && pipelines.length > 0) {
                //should update the pipelines to be a multibranch parent
                this.logger.info("start upgrade of pipelines to be multibranch pipelines ");
                await this.upgradePipelines(pipelines, octaneSDKConnection);
            }
        }
    }

    private async upgradePipelines(pipelines,octaneSDKConnection): Promise<void>{
        let pipelinesToUpdate = [];
        pipelines.forEach(pipeline => pipelinesToUpdate.push(this.createPipelineBody(pipeline)));
        this.logger.debug('Pipelines update body:' + pipelines);

        if(pipelinesToUpdate.length >0) {
            let pipelinesData = '{ "data":' + JSON.stringify(pipelinesToUpdate) + ',"total_count":' + pipelinesToUpdate.length + '}';

            let results = [
                await octaneSDKConnection.update(EntityTypeRestEndpointConstants.PIPELINES_REST_API_NAME, JSON.parse(pipelinesData)).execute()
            ];

            if (results.length === pipelinesToUpdate.length) {
                this.logger.info("Pipelines have been upgraded successfully ");
            }
        }
    }

    private async updateExistCIJobs(ciJobs,ciServerId,workspaceId,octaneSDKConnection): Promise<void> {
        let ciJobsToUpdate = [];
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        for(const ciJob of ciJobs){
            const parameters =
                await this.parametersService.getDefinedParametersWithBranch(api,
                                                                            this.buildId,
                                                                            this.definitionId,
                                                                            this.projectName,
                                                                            this.sourceBranch,
                                                                            false,
                                                                            this.authenticationService.getAzureAccessToken(),
                                                                            this.featureToggleService.isUseAzureDevopsParametersInOctaneEnabled());
            ciJobsToUpdate.push(this.createCiJobBody(ciJob,parameters))
        }

        this.logger.debug('CI Jobs update body:' + ciJobs);

        const url = this.ciInternalAzureApiUrlPart.replace('{workspace_id}',workspaceId) + '/ci_job_update?ci-server-id=' + ciServerId;
        await octaneSDKConnection._requestHandler.update(url,ciJobsToUpdate);
    }

    private async updateExistCiJobNameIfNeeded(ciJobs,workspaceId,ciServerId,octaneSDKConnection){
        let ciJobsToUpdate = [];
        for(const ciJob of ciJobs){
            if(ciJob.name === this.agentJobName || BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase() === ciJob.name?.toLowerCase()) {
                ciJobsToUpdate.push({
                    'name': this.buildDefinitionName,
                    'jobId': ciJob.id,
                    'jobCiId': this.getParentJobCiId()
                });
            }
        }
        if(ciJobsToUpdate.length > 0) {
            this.logger.info('CI Jobs update body:' + ciJobs);

            const url = this.ciInternalAzureApiUrlPart.replace('{workspace_id}', workspaceId) + '/ci_job_update?ci-server-id=' + ciServerId;
            await octaneSDKConnection._requestHandler.update(url, ciJobsToUpdate);
        }
    }

    private createPipelineBody(pipeline){
        return {
            'id': pipeline.id,
            'multi_branch_type': 'PARENT',
        }
    }
    public createCiJobBody(ciJob,parameters){
        let jobCiId = this.getParentJobCiId();

        return {
            'name': this.buildDefinitionName,
            'jobId': ciJob.id,
            'definitionId': this.definitionId,
            'jobCiId': jobCiId,
            'parameters': parameters
        }
    }

    private async createPipeline(octaneSDKConnection, workspaceId, pipelineName, rootJobName, ciServer) {
        let pipeline;
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());

            const parameters =
                await this.parametersService.getDefinedParametersWithBranch(api,
                                                                            this.buildId,
                                                                            this.definitionId,
                                                                            this.projectName,
                                                                            this.sourceBranch,
                                                                            false,
                                                                            this.authenticationService.getAzureAccessToken(),
                                                                            this.featureToggleService.isUseAzureDevopsParametersInOctaneEnabled());

            pipeline = {
                'name': pipelineName,
                'ci_server': {'type': EntityTypeConstants.CI_SERVER_ENTITY_TYPE, 'id': ciServer.id},
                'jobs': [{
                    'name': this.buildDefinitionName,
                    'jobCiId': this.getParentJobCiId(),
                    'definitionId': this.definitionId,
                    'parameters': parameters,
                }],
                'root_job_ci_id': this.getParentJobCiId(),
                'notification_track': false,
                   'notification_track_tester': false
            };

        pipeline.multi_branch_type = 'PARENT';

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

    protected async createCiJob(octaneSDKConnection, ciServer) {
        let ciJob;
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());

        const parameters =
            await this.parametersService.getDefinedParametersWithBranch(api,
                                                                        this.buildId,
                                                                        this.definitionId,
                                                                        this.projectName,
                                                                        this.sourceBranch,
                                                                        false,
                                                                        this.authenticationService.getAzureAccessToken(),
                                                                        this.featureToggleService.isUseAzureDevopsParametersInOctaneEnabled());
        ciJob = {
            'name': this.agentJobName,
            'ci_id': this.getParentJobCiId(),
            'ci_server': {'type': EntityTypeConstants.CI_SERVER_ENTITY_TYPE, 'id': ciServer.id},
            'definition_id': this.definitionId,
            'parameters': parameters
        }

        let ciJobs = [
            await octaneSDKConnection.create(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME, ciJob).execute()
        ];

        if (ciJobs.length === 1) {
            this.logger.info('CiJob ' + ciJobs[0].data[0].id + ' created');
        } else {
            this.logger.error('CiJob creation failed', this.logger.getCaller());
        }

        return ciJobs;
    }

    protected static escapeOctaneQueryValue(q) {
        return q && q.replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }

    private async doesOctaneSupportCreatingCIJobsDirectly(octaneSDKConnection) {
        let currentVersion = await this.getOctaneVersion(octaneSDKConnection);
        return OctaneConnectionUtils.isVersionGreaterOrEquals(currentVersion, "16.2.100")
    }
}