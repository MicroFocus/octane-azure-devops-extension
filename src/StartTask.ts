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
        for (let ws in this.octaneConnections) {
            if (this.octaneConnections[ws]) {
                if (!this.isPipelineEndJob) {
                    let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));
                    let startEvent = new CiEvent(this.jobName, CiEventType.STARTED, this.buildId, this.buildId, this.jobFullName, null, new Date().getTime(), null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
                    await this.sendEvent(this.octaneConnections[ws], startEvent);
                }

                if (this.isPipelineStartJob) {
                    let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId), this.gitAccessToken, this.logger);
                    this.logger.debug(scmData);
                    let scmEvent = new CiEvent(this.jobName, CiEventType.SCM, this.buildId, this.buildId, this.jobFullName, null, new Date().getTime(), null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);
                    await this.sendEvent(this.octaneConnections[ws], scmEvent);
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }
}
