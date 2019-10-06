import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {ScmBuilder} from "./dto/scm/ScmBuilder";
import {CiEventCauseBuilder} from "./dto/events/CiEventCauseBuilder";
import {LogUtils} from "./LogUtils";

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
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);

        if(!this.isPipelineEndJob) {
            let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, parseInt(this.buildId));
            let startEvent = new CiEvent(this.jobName, CiEventType.STARTED, this.buildId, this.buildId, this.fullProjectName, null, new Date().getTime(), null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
            await this.sendEvent(startEvent);
        }

        if(this.isPipelineStartJob) {
            let scmData = await ScmBuilder.buildScmData(api, this.fullProjectName, parseInt(this.buildId), this.logger);
            this.logger.debug(scmData);
            let scmEvent = new CiEvent(this.jobName, CiEventType.SCM, this.buildId, this.buildId, this.fullProjectName, null, new Date().getTime(), null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);
            await this.sendEvent(scmEvent);
        }
    }
}
