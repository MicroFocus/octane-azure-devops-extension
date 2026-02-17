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
import {BaseTask} from "./BaseTask";
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType, Result} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {CiEventCauseBuilder} from "./services/events/CiEventCauseBuilder";
import * as ba from "azure-devops-node-api/BuildApi";
import {TaskResult, TimelineRecord,} from "azure-devops-node-api/interfaces/BuildInterfaces";
import {InputConstants} from "./ExtensionConstants";
import {CiParameter} from "./dto/events/CiParameter";
import {TestResultBuildAttributes} from "./dto/test_results/TestResultBuildAttributes";
import {convertGherkinXMLToOctaneXML, convertJUnitXMLToOctaneXML,} from "@microfocus/alm-octane-test-result-convertion";
import * as fs from 'fs';
import {glob} from 'glob';
import {FrameworkType, stringToFrameworkType} from "@microfocus/alm-octane-test-result-convertion/dist/model/common/FrameworkType";
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as path from "path";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: false
});

const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: ''
});


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
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(
            this.collectionUri,
            this.authenticationService.getAzureAccessToken()
        );
        for (let ws in this.octaneSDKConnections) {
            if (this.octaneSDKConnections[ws]) {
                let testResultExpected = false;
                if (this.isPipelineEndJob) {
                    const cucumberReportsPath = this.tl.getInput(
                        InputConstants.CUCUMBER_REPORT_PATH
                    );

                    this.logger.info("Updated version.");

                    const buildConfig = new TestResultBuildAttributes(
                        this.instanceId,
                        this.buildId,
                        this.jobFullName
                    );

                    this.logger.info(
                        "This is the buildConfig: ", this.buildId, this.instanceId, this.jobFullName,
                        buildConfig
                    );

                    let testResults = [];
                    const framework = this.tl.getInput(InputConstants.FRAMEWORK);

                    this.logger.info(`The framework is: ${framework}`);

                    const frameworkType = stringToFrameworkType(framework)
                    this.logger.info(`The framework type is: ${frameworkType}`);

                    const globPattern = process.env.UNIT_TEST_RESULTS_GLOB_PATTERN || '**/*.xml';
                    this.logger.info("global pattern ", globPattern);

                    const files = glob.sync(globPattern);
                    this.logger.info("The test result files are: " + files + " with length: " + files.length);

                    if (files.length === 0) {
                        this.logger.warn("No test results");
                        await this.buildCIAndSendCIEvent(api, ws, testResultExpected);
                        return;
                    }

                    testResults = await this.handleTestResultInjection(cucumberReportsPath, files, buildConfig, framework, frameworkType);
                    this.logger.info("The converted test results to Octane XML are: " + testResults);

                    for (const testResult of testResults) {
                        if (testResult && testResult.length > 0) {
                            testResultExpected = true;
                            await this.sendTestResult(
                                this.octaneSDKConnections[ws],
                                testResult
                            );
                        }
                    }
                }
                await this.buildCIAndSendCIEvent(api, ws, testResultExpected);
                break; // events are sent to the sharedspace, thus sending event to a single connection is enough
            }
        }
    }

    /**
     * This method handles the test result conversion to Octane XML format based on the provided framework and files.
     * @param cucumberReportsPath - the path to the cucumber reports in case of BDD framework
     * @param files - the files containing the test results
     * @param buildConfig - the build configuration
     * @param framework - the testing framework provided by the user
     * @param frameworkType - the type of the testing framework after mapping the string to FrameworkType enum
     * @returns An array representing the converted test results in Octane XML format based on the provided parameters. These test results are ready to be injected into Octane.
     * @private
     */
    private async handleTestResultInjection(cucumberReportsPath: string | undefined, files: string[], buildConfig: TestResultBuildAttributes, framework: string, frameworkType: FrameworkType): Promise<string[]> {
        const testResults = [];
        if (cucumberReportsPath) {
            const xml = fs.readFileSync(cucumberReportsPath, "utf8").replace(/^\uFEFF/, '');
            const converted = convertGherkinXMLToOctaneXML(xml, buildConfig, FrameworkType.BDDScenario);
            testResults.push(converted);
        } else {
            for (const file of files) {
                const xml = fs.readFileSync(file, "utf-8");
                const converted = convertJUnitXMLToOctaneXML(xml, buildConfig, frameworkType);

                if (framework === "uft") {
                    const jsonObj = parser.parse(converted);
                    const testFields = Array.isArray(jsonObj.test_result.test_fields.test_field) ? jsonObj.test_result.test_fields.test_field : [jsonObj.test_result.test_fields.test_field];
                    testFields.push({
                        type: "Testing_Tool_Type",
                        value: "UFT One"
                    })
                    const testRuns = Array.isArray(jsonObj.test_result.test_runs.test_run) ? jsonObj.test_result.test_runs.test_run : [jsonObj.test_result.test_runs.test_run];
                    for (const run of testRuns) {
                        const classPath = run.class;
                        const testName = run.name;

                        const packageName = this.createPackageName(classPath);
                        run.class = this.createClassName(classPath, testName);
                        run.package = packageName;
                    }

                    const newXml = builder.build(jsonObj);
                    testResults.push(newXml);
                } else {
                    testResults.push(converted);
                }
            }
        }
        return testResults;
    }

    private async buildCIAndSendCIEvent(api: WebApi, ws: string, testResultExpected: boolean) {
        if (!this.isPipelineStartJob) {
            let causes = await CiEventCauseBuilder.buildCiEventCauses(
                this.isPipelineJob,
                api,
                this.projectName,
                this.rootJobFullName,
                parseInt(this.buildId)
            );
            let buildResult = await this.getStatus(api);
            let duration = await this.getDuration(api);
            const parameters: CiParameter[] =
                await this.parametersService.getParametersWithBranch(
                    api,
                    this.definitionId,
                    this.buildId,
                    this.projectName,
                    this.sourceBranch,
                    false,
                    this.featureToggleService.isUseAzureDevopsParametersInOctaneEnabled()
                );

            let endEvent;

            let jobCiId = this.getJobCiId();
            endEvent = new CiEvent(
                this.buildDefinitionName + " " + this.sourceBranchName,
                CiEventType.FINISHED,
                this.buildId,
                this.buildId,
                jobCiId,
                buildResult,
                new Date().getTime(),
                null,
                duration,
                null,
                this.isPipelineJob ? PhaseType.POST : PhaseType.INTERNAL,
                causes,
                parameters,
                "CHILD",
                this.getParentJobCiId(),
                this.sourceBranch,
                testResultExpected
            );

            await this.sendEvent(this.octaneSDKConnections[ws], endEvent);
        }
    }

    private async getStatus(api: WebApi) {
        if (this.isPipelineEndJob) {
            let buildApi: ba.IBuildApi = await api.getBuildApi();
            let timeline = await buildApi.getBuildTimeline(
                this.projectName,
                parseInt(this.buildId)
            );
            const isJobOrTask = (record: TimelineRecord) =>
                record.type === "Job" || record.type === "Task";

            const shouldAbort =
                timeline.records.some(
                    (record) =>
                        isJobOrTask(record) && record.result === TaskResult.Canceled
                ) || (await this.areIntermediateJobsAllSkipped(timeline.records));
            if (shouldAbort) {
                return Result.ABORTED;
            }

            let failed_jobs = timeline.records.filter(
                (r) =>
                    isJobOrTask(r) &&
                    r.name.toLowerCase() !==
                    BaseTask.ALM_OCTANE_PIPELINE_START.toLowerCase() &&
                    r.name.toLowerCase() !==
                    BaseTask.ALM_OCTANE_PIPELINE_END.toLowerCase() &&
                    r.result == TaskResult.Failed
            );
            return failed_jobs.length > 0 ? Result.FAILURE : Result.SUCCESS;
        } else {
            return this.jobStatus;
        }
    }

    private createPackageName(className: string): string {
        let packageName: string;
        const rootDirectory = process.env.BUILD_SOURCESDIRECTORY;
        className = className.replace("file:///", "");
        packageName = path.relative(rootDirectory, className);
        const parts = packageName.split(/[\/\\]/);
        packageName = parts.join("/");
        return packageName;
    }

    private createClassName(className: string, testName: string): string {
        let newClassName: string;
        const rootDirectory = process.env.BUILD_SOURCESDIRECTORY;
        className = className.replace("file:///", "");
        let firstPart = path.relative(rootDirectory, className);
        if (firstPart) {
            const parts = firstPart.split(/[\/\\]/);
            firstPart = parts.join("/");
            newClassName = firstPart + "/" + testName;
        } else {
            newClassName = testName;
        }
        return newClassName;
    }

    private async areIntermediateJobsAllSkipped(
        records: TimelineRecord[]
    ): Promise<boolean> {
        //TODO: edit to octanestarttaskprivate when testing, edit back to octanestarttask when not testing
        const startTask = records.find((r) => r.name === "octanestarttask");
        const testRunnerStartTask = records.find(
            (r) => r.name === "octanetestrunnerstarttask"
        );
        const endTask = records.find((r) => r.name === "octaneendtask");
        if ((!startTask && !testRunnerStartTask) || !endTask) {
            throw new Error(
                `Could not find ${
                    !startTask ? "octanestarttask" : "octaneendtask"
                } in the provided records.`
            );
        }
        if (startTask) {
            const startTime = new Date(startTask.startTime!).getTime();
            const endTime = new Date(endTask.startTime!).getTime();
            const intermediateTasks = records.filter((record) => {
                if (
                    !(record.type === "Task" || record.type === "Job") ||
                    !record.startTime
                )
                    return false;
                const time = new Date(record.startTime).getTime();
                return time > startTime && time < endTime;
            });
            return intermediateTasks.every((r) => r.result === TaskResult.Skipped);
        }
        return false;
    }

    private async getDuration(api: WebApi) {
        let buildApi: ba.IBuildApi = await api.getBuildApi();
        let timeline = await buildApi.getBuildTimeline(
            this.projectName,
            parseInt(this.buildId)
        );

        let job = timeline.records.filter(
            (r) => r.name.toLowerCase() === BaseTask.ALM_OCTANE_PIPELINE_START_NAME
        )[0];
        if (!job) {
            job = timeline.records.filter(
                (r) =>
                    r.name.toLowerCase() ===
                    BaseTask.ALM_OCTANE_PIPELINE_START_NAME + "private"
            )[0];
        }

        if (job) {
            this.logger.debug(
                "Now is " +
                new Date().toISOString() +
                ". Build start: " +
                job.startTime +
                " , Got from timeline API"
            );
            return new Date().getTime() - job.startTime.getTime();
        } else {
            const build = await buildApi.getBuild(
                this.projectName,
                parseInt(this.buildId)
            );
            if (build) {
                this.logger.debug(
                    "Now is " +
                    new Date().toISOString() +
                    ". Build start: " +
                    build.startTime +
                    " , Got from build API"
                );
                return new Date().getTime() - build.startTime.getTime();
            }
        }
    }
}
