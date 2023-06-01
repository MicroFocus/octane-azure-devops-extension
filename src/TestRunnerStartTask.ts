import {BaseTask} from './BaseTask';
import {
    EntityTypeConstants,
    EntityTypeRestEndpointConstants, InputConstants,
} from "./ExtensionConstants";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {TestExecutionEvent} from "./dto/events/TestExecutionEvent";
import {CiEventCauseBuilder} from "./services/events/CiEventCauseBuilder";
import {CiParameter} from "./dto/events/CiParameter";
import {TestsConverter} from "./services/test_converter/TestsConverter";

const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');

export class TestRunnerStartTask extends BaseTask {

    private executorId: string;
    private executorName: string;
    private executorSubtype: string;
    private ciJobId: string;
    private ciServer: any;
    private executor: any;
    private framework: string;
    private testToConvert: string;

    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<TestRunnerStartTask> {
        let task = new TestRunnerStartTask(tl);
        await task.init(BaseTask.ALM_OCTANE_TEST_RUNNER_START);
        return task;
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

        this.initTestRunnerVariables();
    }

    private async initTestRunnerVariables() {
        await new Promise<void>(async (resolve, reject) => {
            try {
                this.prepareFramework();
                this.prepareTestToConvert();
                resolve();
            } catch (ex) {
                reject(ex);
            }
        }).catch(ex => {
            this.logger.error(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'Tests Converter initialization failed');

            throw ex;
        });
    }

    private prepareFramework():void {
        this.framework = this.tl.getInput(InputConstants.FRAMEWORK, true);
    }
    private prepareTestToConvert(): void {
        this.testToConvert = this.tl.getVariable('testsToRun');
        this.logger.debug("testsToRun: " + this.testToConvert);
    }

    protected async createOctaneConnectionsAndRetrieveCiServersAndPipelines() {
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
                await this.initializeExperiments(octaneSDKConnection,ws);
                this.ciServer = await this.getCiServer(octaneSDKConnection, this.agentJobName === BaseTask.ALM_OCTANE_PIPELINE_START ||
                    this.agentJobName === BaseTask.ALM_OCTANE_TEST_RUNNER_START);

                this.executor = await this.getExecutor(octaneSDKConnection, this.buildDefinitionName, this.pipelineFullName, this.ciServer);

                this.octaneSDKConnections[ws] = octaneSDKConnection;
            })(ws);
        }
    }

    protected async getExecutor(octaneSDKConnection, pipelineName, rootJobName, ciServer) {
        let executors;
        const executorQuery = Query.field('ci_id').equal(BaseTask.escapeOctaneQueryValue(this.getJobCiId()))
            .and(Query.field(EntityTypeConstants.CI_SERVER_ENTITY_TYPE).equal(Query.field('id').equal(ciServer.id))).build();

        this.logger.info('executorQuery: ', executorQuery);

        let ciJobs = await octaneSDKConnection.get(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME)
            .fields('name,ci_server{server_type},name,ci_id,parameters,executor{id, subtype}')
            .query(executorQuery).execute();

        this.logger.info('ciJobs: ', JSON.stringify(ciJobs));

        if (ciJobs && ciJobs.total_count > 0 && ciJobs.data) {
            this.ciJobId = ciJobs.data[0].id;
            executors = ciJobs.data.filter(ciJob => ciJob.executor).map(ciJob => ciJob.executor);
        } else {
            await this.createCiJob(octaneSDKConnection);
        }
        if (!executors || executors.length == 0) {
            // If missing executor - create
            return await this.createExecutor(octaneSDKConnection);
        } else {
            this.logger.debug('Found executor get executor id and parameters');
            this.executorId = executors[0].id;
            this.tl.setVariable('ENDPOINT_DATA_TEST_RUNNER_ID', this.executorId);
            this.executorName = executors[0].name;
            this.executorSubtype = executors[0].type;
        }
        return executors[0];
    }

    private async createCiJob(octaneSDKConnection) {
        const api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        const  parameters = await this.parametersService.getDefinedParametersWithBranch(api, this.definitionId,
            this.projectName, this.sourceBranch, this.experiments.support_azure_multi_branch ? false : true);
        const ciJob = {
            'name': this.buildDefinitionName + " " + this.sourceBranchName,
            'parameters': parameters,
            'ci_id': this.getJobCiId(),
            'ci_server': {
                'id': this.ciServer.id,
                'type': EntityTypeConstants.CI_SERVER_ENTITY_TYPE
            },
            'branch': this.sourceBranch,
            'definition_id': this.definitionId
        }

        let ciJobs = [
            await octaneSDKConnection.create(EntityTypeRestEndpointConstants.CI_JOB_REST_API_NAME, ciJob).execute()
        ];

        if (ciJobs.length === 1) {
            this.ciJobId = ciJobs[0].data[0].id;
            this.logger.info('CI job created ' + this.ciJobId + ' created');
        } else {
            this.logger.error('CI job failed to create', this.logger.getCaller());
        }

        return ciJobs;
    }

    private async createExecutor(octaneSDKConnection) {
        const framework = this.framework;
        this.logger.debug('framework: ' + framework);
        const frameworkId = await this.getFrameworkId(framework);
        let test_runner = {
            'name': this.buildDefinitionName,
            'subtype': EntityTypeConstants.TEST_RUNNER_ENTITY_TYPE,
            'framework': {
                'type': "list_node",
                'id': frameworkId
            },
            'ci_server': {
                'id': this.ciServer.id,
                'type': EntityTypeConstants.CI_SERVER_ENTITY_TYPE
            },
            'ci_job': {
                'id': this.ciJobId,
                'type': EntityTypeConstants.CI_JOB_ENTITY_TYPE
            }
        };

        let executors = [
            await octaneSDKConnection.create(EntityTypeRestEndpointConstants.EXECUTORS_REST_API_NAME, test_runner).execute()
        ];

        if (executors.length === 1) {
            this.executorId = executors[0].data[0].id;
            this.logger.info('Executor ' + this.executorId + ' created');
        } else {
            this.logger.error('Executor', this.logger.getCaller());
        }

        this.tl.setVariable('ENDPOINT_DATA_TEST_RUNNER_ID', this.executorId);

        return executors;
    }

    private async getFrameworkId(framework) {
        switch (framework) {
            case "gradle":
                return "list_node.je.framework.junit";
            case "testNG":
                return "list_node.je.framework.testng";
            case "protractor":
                return "list_node.testing_tool_type.protractor";
            case "cucumber":
                return "list_node.je.framework.cucumber";
            case "bddScenario":
                return "list_node.je.framework.cucumber";
            case "jbehave":
                return "list_node.je.framework.jbehave";
            case "junit":
                return "list_node.je.framework.junit";
            default:
                this.logger.debug('No framework selected. Setting to default junit.');
                return "list_node.je.framework.junit";
        }
    }

    public async run() {

        const executionId = this.tl.getVariable('executionId');
        const suiteRunId = this.tl.getVariable('suiteRunId');

        this.logger.info("executionId: " + executionId);
        this.logger.info("suiteRunId: " + suiteRunId);

        //run the converter functionality only in case we have the execution id from Octane side
        if(typeof executionId!='undefined' && executionId &&
            typeof suiteRunId!='undefined' && suiteRunId) {

            let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
            let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));

            const parameters: CiParameter[] = this.experiments.run_azure_pipeline_with_parameters ?
                await this.parametersService.getParametersWithBranch(api, this.definitionId, this.buildId, this.projectName,
                    this.sourceBranch,this.experiments.support_azure_multi_branch?false:true)
                :undefined;

            let startEvent = new TestExecutionEvent(this.buildDefinitionName + " " + this.sourceBranchName,
                CiEventType.STARTED, this.buildId, this.buildId, this.getJobCiId(), null, new Date().getTime(),
                executionId, suiteRunId, null, null, null,
                this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes, parameters,
                'CHILD', this.getParentJobCiId(), this.sourceBranch);

            for (let ws in this.octaneSDKConnections) {
                this.logger.debug("octaneConnection per ws: " + ws);
                if (this.octaneSDKConnections[ws]) {
                    let startTime: Date = new Date();
                    this.logger.info('Run start time: ' + startTime.toTimeString());

                    try {
                        await this.runInternal();
                    } catch (ex) {
                        this.logger.error('Tests Converter failed to properly execute: ' + ex);
                    }

                    await this.sendEvent(this.octaneSDKConnections[ws], startEvent);

                    let endTime: Date = new Date();

                    this.logger.info('Run end time: ' + endTime.toTimeString());
                    let diff = endTime.getTime() - startTime.getTime();
                    this.logger.info('Total duration: ' +
                        (Math.floor(diff / 1000.0)) + ' seconds, ' + (diff % 1000.0) + ' millis');
                    this.logger.info('Shutting down...');
                }
            }
        } else {
            this.logger.info("there is no execution id (meaning - no suite run from Octane), no need to send event")
        }
    }

    private async runInternal(){
        let converter = new TestsConverter(this.tl);
        let convertedTests = converter.convert(this.testToConvert, this.framework);
        this.tl.setVariable('testsToRunConverted', convertedTests);
    }

}
