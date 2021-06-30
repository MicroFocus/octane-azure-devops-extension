import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {ScmBuilder} from "./services/scm/ScmBuilder";
import {CiEventCauseBuilder} from "./services/events/CiEventCauseBuilder";

export class StartTask extends BaseTask {
    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<StartTask> {
        let task = new StartTask(tl);
        await task.init(BaseTask.ALM_OCTANE_PIPELINE_START);
        return task;
    }

    public async run() {
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.authenticationService.getAzureAccessToken());
        for (let ws in this.octaneSDKConnections) {
            this.logger.debug("octaneConnection per ws: " + ws);
            if (this.octaneSDKConnections[ws]) {
                if (!this.isPipelineEndJob) {
                    let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));
                    let startEvent = new CiEvent(this.agentJobName, CiEventType.STARTED, this.buildId, this.buildId, this.jobFullName, null, new Date().getTime(), null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes);
                    await this.sendEvent(this.octaneSDKConnections[ws], startEvent);
                }

                if (this.isPipelineStartJob) {
                    let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId), this.sourceBranchName, this.tl, this.logger);
                    this.logger.debug(scmData);
                    let scmEvent = new CiEvent(this.agentJobName, CiEventType.SCM, this.buildId, this.buildId, this.jobFullName, null, new Date().getTime(), null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);
                    await this.sendEvent(this.octaneSDKConnections[ws], scmEvent);
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }
}
