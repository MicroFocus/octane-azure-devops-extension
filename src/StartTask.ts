import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {ScmBuilder} from "./dto/scm/ScmBuilder";
import {CiEventCauseBuilder} from "./dto/events/CiEventCauseBuilder";

export class StartTask extends BaseTask {
    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<StartTask> {
        let task = new StartTask(tl);
        await task.init();
        return task;
    }

    public async run() {
        let jobName = this.tl.getVariable('Agent.JobName');
        let isPipelineJob = jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase() || jobName.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase();
        console.log('My name is ' + jobName + '. I\'m a pipeline job: ' + isPipelineJob);
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);
        let causes = await CiEventCauseBuilder.buildCiEventCauses(isPipelineJob, api, this.projectName, parseInt(this.buildId));
        let fullProjectName = this.projectName + (isPipelineJob ? '' : '.' + jobName);
        let startEvent = new CiEvent(jobName, CiEventType.STARTED, this.buildId, this.buildId, fullProjectName, null, new Date().getTime(), 10000000, 10, null, isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
        await this.sendEvent(startEvent);

        if(isPipelineJob) {
            let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId));
            console.log(scmData);
            let scmEvent = new CiEvent(jobName, CiEventType.SCM, this.buildId, this.buildId, fullProjectName, null, new Date().getTime(), 10000000, 10, scmData, isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);
            await this.sendEvent(scmEvent);
        }
    }
}