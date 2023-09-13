/*
 * Copyright 2020-2023 Open Text
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
                            null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes, parameters, 'CHILD',this.getParentJobCiId(), this.sourceBranch);
                    } else{
                        startEvent = new CiEvent(this.agentJobName, CiEventType.STARTED, this.buildId, this.buildId,this.jobFullName, null, new Date().getTime(),
                            null, null, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL, causes, parameters)
                    }

                    await this.sendEvent(this.octaneSDKConnections[ws], startEvent);
                }

                if (this.isPipelineStartJob) {
                    let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId), this.sourceBranchName, this.tl, this.logger);
                    this.logger.debug(scmData);
                    let scmEvent;
                    if(this.experiments.support_azure_multi_branch){
                        let jobCiId = this.getJobCiId();
                        scmEvent = new CiEvent(this.buildDefinitionName + " " +this.sourceBranchName, CiEventType.SCM, this.buildId, this.buildId,jobCiId, null, new Date().getTime(), null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);

                    } else {
                        scmEvent = new CiEvent(this.agentJobName, CiEventType.SCM, this.buildId, this.buildId,this.jobFullName, null, new Date().getTime(),null, null, scmData, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL);

                    }
                    await this.sendEvent(this.octaneSDKConnections[ws], scmEvent);
                }
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }
}
