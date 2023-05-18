import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {ScmBuilder} from "./services/scm/ScmBuilder";
import {CiEventCauseBuilder} from "./services/events/CiEventCauseBuilder";
import {CiParameter} from "./dto/events/CiParameter";

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

                    const parameters: CiParameter[] = this.experiments.run_azure_pipeline_with_parameters ?
                            await this.parametersService.getParametersWithBranch(api,this.definitionId,this.buildId,this.projectName,this.sourceBranch,this.experiments.support_azure_multi_branch?false:true)
                        :undefined;

                    let startEvent;
                    if(this.experiments.support_azure_multi_branch){
                        let jobCiId = this.getJobCiId();
                        startEvent = new CiEvent(this.buildDefinitionName + " " +this.sourceBranchName, CiEventType.STARTED, this.buildId, this.buildId, jobCiId, null, new Date().getTime(),
                            this.createPipelineRequired, null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes, parameters,
                            'CHILD',this.getParentJobCiId(), this.sourceBranch);
                    } else{
                        startEvent = new CiEvent(this.agentJobName, CiEventType.STARTED, this.buildId, this.buildId,this.jobFullName, null, new Date().getTime(),
                            this.createPipelineRequired, null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes, parameters)
                    }

                    await this.sendEvent(this.octaneSDKConnections[ws], startEvent);
                }

                if (this.isPipelineStartJob) {
                    let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId), this.sourceBranchName, this.tl, this.logger);
                    this.logger.debug(scmData);
                    let scmEvent;
                    if(this.experiments.support_azure_multi_branch){
                        let jobCiId = this.getJobCiId();
                        scmEvent = new CiEvent(this.buildDefinitionName + " " +this.sourceBranchName, CiEventType.SCM, this.buildId, this.buildId,jobCiId, null, new Date().getTime(), this.createPipelineRequired, null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);

                    } else {
                        scmEvent = new CiEvent(this.agentJobName, CiEventType.SCM, this.buildId, this.buildId,this.jobFullName, null, new Date().getTime(), this.createPipelineRequired, null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);

                    }
                    await this.sendEvent(this.octaneSDKConnections[ws], scmEvent);
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }
}
