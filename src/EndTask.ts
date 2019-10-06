import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType, Result} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {TestResultsBuilder} from "./services/TestResultsBuilder";
import {CiEventCauseBuilder} from "./dto/events/CiEventCauseBuilder";
import * as ba from "azure-devops-node-api/BuildApi";
import {TaskResult} from "azure-devops-node-api/interfaces/BuildInterfaces";

export class EndTask extends BaseTask {
    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<EndTask> {
        let task = new EndTask(tl);
        await task.init();
        return task;
    }

    public async run() {
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);
        let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, parseInt(this.buildId));
        if (!this.isPipelineJob) {
            let buildResult = await this.getStatus(api);
            let duration = await this.getDuration(api);
            let endEvent = new CiEvent(this.jobName, CiEventType.FINISHED, this.buildId, this.buildId, this.fullProjectName, buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
            await this.sendEvent(endEvent);
        }
        if (this.isPipelineEndJob) {
            let buildResult = await this.getStatus(api);
            let duration = await this.getDuration(api);
            let endEvent = new CiEvent(this.jobName, CiEventType.FINISHED, this.buildId, this.buildId, this.fullProjectName, buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
            await this.sendEvent(endEvent);
            let testResult: string = await TestResultsBuilder.getTestsResultsByBuildId(api, this.fullProjectName, parseInt(this.buildId), this.instanceId, this.fullProjectName, this.logger);
            if(testResult) {
                await this.sendTestResult(testResult);
            }
        }
    }

    private async getStatus(api: WebApi) {
        if (this.isPipelineEndJob) {
            let buildApi: ba.IBuildApi = await api.getBuildApi();
            let timeline = await buildApi.getBuildTimeline(this.projectName, parseInt(this.buildId));
            let failed_jobs = timeline.records.filter(r => r.type == 'Job'
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
        let jobName = this.isPipelineEndJob ? BaseTask.ALM_OCTANE_PIPELINE_START : this.jobName;
        let job = timeline.records.filter(r => r.type == 'Job' && r.name.toLowerCase() === jobName.toLowerCase())[0];
        if(!job){
            return 0;
        }
        return new Date().getTime() - job.startTime.getTime();
    }
}
