import {BaseTask} from './BaseTask';
import {CiEvent} from './dto/events/CiEvent';
import {CiEventType, PhaseType, Result} from './dto/events/CiTypes';
import {WebApi} from 'azure-devops-node-api';
import {ConnectionUtils} from './ConnectionUtils';
import {TestResultsBuilder} from './services/test_results/TestResultsBuilder';
import {CiEventCauseBuilder} from './services/events/CiEventCauseBuilder';
import * as ba from 'azure-devops-node-api/BuildApi';
import {TaskResult} from 'azure-devops-node-api/interfaces/BuildInterfaces';
import {InputConstants} from './ExtensionConstants';
import {CiParameter} from "./dto/events/CiParameter";

export class EndTask extends BaseTask {
    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<EndTask> {
        let task = new EndTask(tl);
        await task.init(BaseTask.ALM_OCTANE_PIPELINE_END);
        return task;
    }

    public async run() {
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        for(let ws in this.octaneSDKConnections) {
            if(this.octaneSDKConnections[ws]) {
                if (this.isPipelineEndJob) {
                    const cucumberReportsPath = this.tl.getInput(InputConstants.CUCUMBER_REPORT_PATH);

                    let testResults: string[] = await TestResultsBuilder.getTestsResultsByBuildId(api, this.projectName, parseInt(this.buildId), this.instanceId, this.jobFullName, cucumberReportsPath, this.logger,this.experiments.upgrade_azure_test_runs_paths);
                    for (const testResult of testResults) {
                        if (testResult && testResult.length > 0) {
                            await this.sendTestResult(this.octaneSDKConnections[ws], testResult);
                        }
                    }
                }
                if (!this.isPipelineStartJob) {
                    let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));
                    let buildResult = await this.getStatus(api);
                    let duration = await this.getDuration(api);
                    const parameters:CiParameter[] = this.experiments.run_azure_pipeline_with_parameters ?
                            await this.parametersService.getParametersWithBranch(api,this.definitionId,this.buildId,this.projectName,this.sourceBranch, this.experiments.support_azure_multi_branch?false:true)
                        :undefined;

                    let endEvent;

                    if(this.experiments.support_azure_multi_branch){
                        let jobCiId = this.getJobCiId();
                         endEvent = new CiEvent(this.buildDefinitionName + " " +this.sourceBranchName , CiEventType.FINISHED, this.buildId, this.buildId, jobCiId,
                             buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL,
                             causes,parameters,'CHILD',this.getParentJobCiId(), this.sourceBranch);
                    } else {
                         endEvent = new CiEvent(this.agentJobName , CiEventType.FINISHED, this.buildId, this.buildId, this.jobFullName, buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes,parameters);

                    }

                    await this.sendEvent(this.octaneSDKConnections[ws], endEvent);
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }

    private async getStatus(api: WebApi) {
        if (this.isPipelineEndJob) {
            let buildApi: ba.IBuildApi = await api.getBuildApi();
            let timeline = await buildApi.getBuildTimeline(this.projectName, parseInt(this.buildId));
            let failed_jobs = timeline.records.filter(r => (r.type == 'Job' || r.type == 'Task')
                && r.name.toLowerCase() !== BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase()
                && r.name.toLowerCase() !== BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase()
                && r.result == TaskResult.Failed);
            return failed_jobs.length > 0 ? Result.FAILURE : Result.SUCCESS;
        } else {
            return this.jobStatus;
        }
    }

    private async getDuration(api: WebApi) {
        let buildApi: ba.IBuildApi = await api.getBuildApi();
        let timeline = await buildApi.getBuildTimeline(this.projectName, parseInt(this.buildId));

        let job = timeline.records.filter(r => r.name.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START_NAME)[0];
        if (!job) {
            job = timeline.records.filter(r => r.name.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START_NAME +'private')[0];
        }

        if(job) {
            this.logger.debug('Now is ' + new Date().toISOString() + '. Build start: ' + job.startTime + ' , Got from timeline API');
            return new Date().getTime() - job.startTime.getTime();
        } else {
            const build = await buildApi.getBuild(this.projectName, parseInt(this.buildId));
            if(build) {
                this.logger.debug('Now is ' + new Date().toISOString() + '. Build start: ' + build.startTime + ' , Got from build API');
                return new Date().getTime() - build.startTime.getTime();
            }
        }

    }
}
