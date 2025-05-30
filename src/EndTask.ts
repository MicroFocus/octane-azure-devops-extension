/*
 * Copyright 2020-2025 Open Text
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
import {CiEvent} from './dto/events/CiEvent';
import {CiEventType, PhaseType, Result} from './dto/events/CiTypes';
import {WebApi} from 'azure-devops-node-api';
import {ConnectionUtils} from './ConnectionUtils';
import {TestResultsBuilder} from './services/test_results/TestResultsBuilder';
import {CiEventCauseBuilder} from './services/events/CiEventCauseBuilder';
import * as ba from 'azure-devops-node-api/BuildApi';
import {TaskResult, TimelineRecord} from 'azure-devops-node-api/interfaces/BuildInterfaces';
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
                let testResultExpected = false;
                if (this.isPipelineEndJob) {
                    const cucumberReportsPath = this.tl.getInput(InputConstants.CUCUMBER_REPORT_PATH);

                    let testResults: string[] = await TestResultsBuilder.getTestsResultsByBuildId(api, this.projectName, parseInt(this.buildId), this.instanceId, this.jobFullName, cucumberReportsPath, this.logger);
                    for (const testResult of testResults) {
                        if (testResult && testResult.length > 0) {
                            testResultExpected = true;
                            await this.sendTestResult(this.octaneSDKConnections[ws], testResult);
                        }
                    }
                }
                if (!this.isPipelineStartJob) {
                    let causes = await CiEventCauseBuilder.buildCiEventCauses(this.isPipelineJob, api, this.projectName, this.rootJobFullName, parseInt(this.buildId));
                    let buildResult = await this.getStatus(api);
                    let duration = await this.getDuration(api);
                    const parameters:CiParameter[] =
                            await this.parametersService.getParametersWithBranch(api,this.definitionId,this.buildId,this.projectName,this.sourceBranch, false, this.featureToggleService.isUseAzureDevopsParametersInOctaneEnabled())

                    let endEvent;

                    let jobCiId = this.getJobCiId();
                    endEvent = new CiEvent(this.buildDefinitionName + " " +this.sourceBranchName , CiEventType.FINISHED, this.buildId, this.buildId, jobCiId,
                        buildResult, new Date().getTime(), null, duration, null, this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL,
                        causes,parameters,'CHILD',this.getParentJobCiId(), this.sourceBranch,testResultExpected);

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
            const isJobOrTask = (record: TimelineRecord) => record.type === 'Job' || record.type === 'Task';

            const shouldAbort = timeline.records.some(record => isJobOrTask(record) && record.result === TaskResult.Canceled)
                || await this.areIntermediateJobsAllSkipped(timeline.records);
            if(shouldAbort) {
                return Result.ABORTED;
            }

            let failed_jobs = timeline.records.filter(r => isJobOrTask(r)
                && r.name.toLowerCase() !== BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase()
                && r.name.toLowerCase() !== BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase()
                && r.result == TaskResult.Failed);
            return failed_jobs.length > 0 ? Result.FAILURE : Result.SUCCESS;
        } else {
            return this.jobStatus;
        }
    }

    private async areIntermediateJobsAllSkipped(records: TimelineRecord[]): Promise<boolean> {
        //TODO: edit to octanestarttaskprivate when testing
        const startTask= records.find(r => r.name === 'octanestarttask');
        const endTask= records.find(r => r.name === 'octaneendtask');
        if (!startTask || !endTask) {
            throw new Error(
                `Could not find ${!startTask ? 'octanestarttask' : 'octaneendtask'} in the provided records.`
            );
        }
        const startTime= new Date(startTask.startTime!).getTime();
        const endTime= new Date(endTask.startTime!).getTime();

        const intermediateTasks = records.filter(record => {
            if (!(record.type === 'Task' || record.type === 'Job') || !record.startTime) return false;
            const time = new Date(record.startTime).getTime();
            return time > startTime && time < endTime;
        });

        return intermediateTasks.every(r => r.result === TaskResult.Skipped);
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
