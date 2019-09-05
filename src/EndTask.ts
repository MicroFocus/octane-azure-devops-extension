import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType, Result} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {TestResultsBuilder} from "./dto/test_results/TestResultsBuilder";
import {CiEventCauseBuilder} from "./dto/events/CiEventCauseBuilder";

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
        let jobName = this.tl.getVariable('Agent.JobName');
        let isPipelineEndJob = jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase();
        let isPipelineJob = jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase() || isPipelineEndJob;
        console.log('My name is ' + jobName + '. I\'m a pipeline job: ' + isPipelineJob);
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);
        let causes = await CiEventCauseBuilder.buildCiEventCauses(isPipelineJob, api, this.projectName, parseInt(this.buildId));
        let fullProjectName = this.projectName + (isPipelineJob ? '' : '.' + jobName);
        let endEvent = new CiEvent(jobName, CiEventType.FINISHED, this.buildId, this.buildId, fullProjectName, Result.SUCCESS, new Date().getTime(), 10000000, 10, null, isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
        await this.sendEvent(endEvent);
        if (isPipelineEndJob) {
            let testResult: string = await TestResultsBuilder.getTestsResultsByBuildId(api, fullProjectName, parseInt(this.buildId), this.instanceId, this.buildId);
            await this.sendTestResult(testResult);
        }
    }
}