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
        await task.init(BaseTask.ALM_OCTANE_PIPELINE_END);
        return task;
    }

    public async run() {
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);
        for(let ws in this.octaneConnections) {
            if(this.octaneConnections[ws]) {
                if (!this.isPipelineStartJob) {
                    let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));
                    let buildResult = await this.getStatus(api);
                    let duration = await this.getDuration(api);
                    let endEvent = new CiEvent(this.agentJobName, CiEventType.FINISHED, this.buildId, this.buildId, this.jobFullName, buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
                    await this.sendEvent(this.octaneConnections[ws], endEvent);
                }

                if (this.isPipelineEndJob) {
                    let testResult = await TestResultsBuilder.getTestsResultsByBuildId(api, this.projectName, parseInt(this.buildId), this.instanceId, this.jobFullName, this.logger);
                    if (testResult) {
                        await this.sendTestResult(this.octaneConnections[ws], testResult);
                    }
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
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
        let job = timeline.records.filter(r => r.name.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase())[0];
        if(!job){
            return 0;
        }
        return new Date().getTime() - job.startTime.getTime();
    }
}
