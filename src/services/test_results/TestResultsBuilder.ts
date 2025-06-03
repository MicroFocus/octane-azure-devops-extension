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
import {UnitResultAttributes} from '../../dto/test_results/UnitResultAttributes';
import {Framework, TestFieldNames, TestRunStatus} from '../../dto/test_results/TestResultEnums';
import {TestResultErrorAttributes} from '../../dto/test_results/TestResultErrorAttributes';
import {TestResultBuildAttributes} from '../../dto/test_results/TestResultBuildAttributes';
import {TestResultTestFieldAttributes} from '../../dto/test_results/TestResultTestFieldAttributes';
import {TestResult} from '../../dto/test_results/TestResult';
import {TestResultTestField} from '../../dto/test_results/TestResultTestField';
import {UnitResultElement} from '../../dto/test_results/UnitResultElement';
import {TestResultError} from '../../dto/test_results/TestResultError';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as ta from 'azure-devops-node-api/TestApi';
import {TestCaseResult, TestRun} from 'azure-devops-node-api/interfaces/TestInterfaces';
import {LogUtils} from '../../LogUtils';
import {GherkinResultElement} from '../../dto/test_results/GherkinResultElement';
import {GherkinResultData} from '../../dto/test_results/GherkinResultData';
import {GherkinScenarioData} from '../../dto/test_results/GherkinScenarioData';
import {EmptyTestResult} from '../../dto/test_results/EmptyTestResult';

let convert = require('xml-js');
let xmlescape = require('xml-escape');
const globby = require('globby');
const {readFileSync} = require('fs-extra');

export class TestResultsBuilder {
    private static readonly CUCUMBER_TEST_TYPE = 'Cucumber';
    private static readonly GHERKIN_OCTANE_TEST_LEVEL_DISPLAY_VALUE = 'Gherkin Test';
    private static readonly UNIT_OCTANE_TEST_LEVEL_DISPLAY_VALUE = 'Unit Test';

    public static buildUnitTestResult(testResults: any, server_id: string, job_id: string, logger: LogUtils): TestResult {
        if (!testResults || !testResults.length) {
            logger.info('No unit test results were retrieved/found');
            return new EmptyTestResult();
        }

        let testResultTestRuns = this.buildUnitResultElement(testResults, logger);
        let testResultTestFields = this.buildTestResultTestFields(testResults[0].automatedTestType);
        let testResultBuild = new TestResultBuildAttributes(server_id, job_id, testResults[0].build.id);

        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    public static buildGherkinTestResult(testResults: GherkinResultData[], server_id: string, job_id: string, build_id: string, logger: LogUtils): TestResult {
        if (!testResults || !testResults.length) {
            logger.info('No gherkin test results were retrieved/found');
            return new EmptyTestResult();
        }

        let testResultTestRuns = this.buildGherkinResultElement(testResults);
        let testResultTestFields = this.buildTestResultTestFields(this.CUCUMBER_TEST_TYPE);
        let testResultBuild = new TestResultBuildAttributes(server_id, job_id, build_id);

        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    private static getTestResultXml(testResult: TestResult, logger: LogUtils): string {
        let options = {compact: true, ignoreComment: true, spaces: 4};
        let convertedXml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><test_result>' + convert.js2xml(testResult, options) + '</test_result>';
        logger.info('Test results converted for Octane');
        logger.debug(convertedXml);
        return convertedXml;
    }

    private static getUnitTestResultXml(testResults: TestCaseResult[], server_id: string, job_id: string, logger: LogUtils): string {
        let result: TestResult = TestResultsBuilder.buildUnitTestResult(testResults, server_id, job_id, logger);

        const {'': testRuns} = result.test_runs;
        if (testRuns.length === 0) {
            return '';
        }

        return this.getTestResultXml(result, logger);
    }

    private static getGherkinTestResultXml(testResults: GherkinResultData[], server_id: string, job_id: string, build_id: string, logger: LogUtils): string {
        let result: TestResult = TestResultsBuilder.buildGherkinTestResult(testResults, server_id, job_id, build_id, logger);

        const {'': testRuns} = result.test_runs;
        if (testRuns.length === 0) {
            return '';
        }

        return this.getTestResultXml(result, logger);
    }

    public static async getTestsResultsByBuildId(connection: WebApi, projectName: string, buildId: number, serverId: string, jobId: string, cucumberReportsPath: string, logger: LogUtils): Promise<string[]> {
        let xmlTestResults: string[] = [];
        let gherkinResults = this.getCucumberReportsFromPath(cucumberReportsPath, logger);
        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let build = await buildApi.getBuild(projectName, buildId);
        let buildURI = build.uri;
        let testApi: ta.ITestApi = await connection.getTestApi();

        if (gherkinResults.length > 0) {
            const generatedXml: string = TestResultsBuilder.getGherkinTestResultXml(gherkinResults, serverId, jobId, buildId.toString(), logger);
            if (!(generatedXml === '')) {
                xmlTestResults.push(generatedXml)
            }
        } else {
            logger.info('No gherkin test results found.')
        }

        let processedTests: Set<string> = this.getProcessedTestNames(gherkinResults);
        let unitTestResults: TestCaseResult[] = await this.getUnitReports(processedTests, testApi, buildURI, projectName);

        if (unitTestResults.length > 0) {
            const generatedXml: string = TestResultsBuilder.getUnitTestResultXml(unitTestResults, serverId, jobId, logger);
            if (!(generatedXml === '')) {
                xmlTestResults.push(generatedXml)
            }
        } else {
            logger.info('No unit test results found.')
        }

        return xmlTestResults;
    }

    private static getProcessedTestNames(gherkinResults: GherkinResultData[]): Set<string> {
        let processedTests: Set<string> = new Set();

        gherkinResults.forEach(gherkinRes => {
            let scenarios: GherkinScenarioData[] = Array.isArray(gherkinRes.feature.scenarios.scenario)
                ? gherkinRes.feature.scenarios.scenario
                : Array.of(gherkinRes.feature.scenarios.scenario);
            scenarios.forEach(scenario => processedTests.add(scenario._attributes.name));
        });

        return processedTests;
    }

    private static async getUnitReports(processedTests: Set<string>, testApi: ta.ITestApi, buildURI: string, projectName: string): Promise<TestCaseResult[]> {
        let results: TestCaseResult[] = [];
        let testRuns : TestRun[];
        testRuns = await testApi.getTestRuns(projectName, buildURI);

        for (let i = 0; i < testRuns.length; i++) {
            let currentTestRuns = testRuns[i];
            let testRunId = currentTestRuns.id;
            const MAX_TEST_RUN_COUNT = 1000;

            const totalTests = currentTestRuns.totalTests;
            // Implement paging to support case of getting more than 1K test runs
            if (totalTests >= MAX_TEST_RUN_COUNT) {
                let currentResults : TestCaseResult[] = []

                for (let j = 1; j <= totalTests/MAX_TEST_RUN_COUNT + 1; j++) {
                    currentResults = await testApi.getTestResults(projectName, testRunId, null, MAX_TEST_RUN_COUNT*(j-1), MAX_TEST_RUN_COUNT);
                    if (currentResults.length > 0) {
                        results = results.concat(currentResults);
                    }
                }
            } else { // No paging required
                results = results.concat(await testApi.getTestResults(projectName, testRunId));
            }
        }

        results = results.filter(result => !processedTests.has(result.automatedTestName));

        return results;
    }

    private static getCucumberReportsFromPath(cucumberReportsPath: string, logger: LogUtils): GherkinResultData[] {
        let gherkinResults: GherkinResultData[] = [];

        if (!cucumberReportsPath) {
            return gherkinResults;
        }

        const inputPath = cucumberReportsPath.replace(/\\/g, '/')
        // const files = globby.sync('C:/CloudAzureAgent/_work/8/s/bdd2OctaneResult/*.xml');
        const files = globby.sync([`${inputPath}/*.xml`])

        logger.info(`Found ${files.length} matching ${inputPath} pattern`)

        let options = {compact: true, ignoreComment: true, spaces: 4};

        files.forEach(filePath => {
            logger.info(`Processing ${filePath}`)
            const rawContent = readFileSync(filePath, 'utf-8')
            const featuresAsJson = convert.xml2js(rawContent, options);

            const features = Array.isArray(featuresAsJson.features.feature)
                ? featuresAsJson.features.feature
                : Array.of(featuresAsJson.features.feature);

            features.forEach(feat =>
            {
                feat._attributes.name = xmlescape(feat._attributes.name);
                const scenarioElement = feat.scenarios.scenario;
                const scenarios = Array.isArray(scenarioElement) ? scenarioElement : Array.of(scenarioElement);
                scenarios.forEach(scenario =>
                {
                    scenario._attributes.name = xmlescape(scenario._attributes.name);
                    if (scenario.steps && scenario.steps.step && scenario.steps.steplength !== 0) {
                        scenario.steps.step.forEach(step => step._attributes.name = xmlescape(step._attributes.name));
                    }
                });
                gherkinResults.push(new GherkinResultData(feat))
            });
        });

        return gherkinResults;
    }

    private static buildUnitResultElement(testResults: any, logger: LogUtils): UnitResultElement[] {
        let unitTestResults: Array<UnitResultElement> = [];
        testResults.forEach(element => {
            logger.debug("Azure test input - automatedTestStorage: " + element.automatedTestStorage + " , automatedTestName: " + element.automatedTestName);
            let packageName =
                element.automatedTestStorage && element.automatedTestStorage.indexOf('.') > 0 ?
                    element.automatedTestStorage.substring(0,element.automatedTestStorage.lastIndexOf('.')) :
                    element.automatedTestStorage;
            packageName = xmlescape(packageName || "");
            if (packageName.length > 255) {
                logger.error('Package name is longer than 255 chars: ' + packageName);
                return;
            }
            let name = xmlescape(element.automatedTestName || "");
            if (name.length > 255) {
                logger.error('Test name is longer than 255 chars: ' + name);
                return;
            }
            let classname =
                element.automatedTestStorage && element.automatedTestStorage.indexOf('.') > 0 ?
                    element.automatedTestStorage.substring(element.automatedTestStorage.lastIndexOf('.') + 1) :
                    element.automatedTestStorage;
            classname = xmlescape(classname || "");
            if (classname.length > 255) {
                logger.error('Classname name is longer than 255 chars: ' + classname);
                return;
            }
            let duration = element.durationInMs || 0;
            let status = this.getStatus(element.outcome);
            let started = Date.parse(element.startedDate);
            let external_report_url = this.buildReportUrl(element);
            let error;
            if (status === TestRunStatus.FAILED) {
                let message = element.errorMessage;
                let stackTrace = element.stackTrace;
                if (!message || 0 === message.length) {
                    message = stackTrace;
                }
                let error_attrib = new TestResultErrorAttributes(xmlescape(message));
                error = new TestResultError(error_attrib, xmlescape(stackTrace));
            } else {
                error = undefined;
            }
            let testResultElem = new UnitResultElement(new UnitResultAttributes(undefined, packageName, name, classname, duration,
                status, started, external_report_url), error);

            unitTestResults.push(testResultElem);
        });
        return unitTestResults;
    }

    private static buildGherkinResultElement(testResults: GherkinResultData[]): GherkinResultElement[] {
        let testResultTestRunList: Array<GherkinResultElement> = [];
        testResults.forEach(gherkinResult => testResultTestRunList.push(new GherkinResultElement(gherkinResult)));

        return testResultTestRunList;
    }

    private static buildReportUrl(element: any): string {
        return element.project.url.split('_apis')[0] + element.project.name + '/_build/results?view=ms.vss-test-web.build-test-results-tab' +
            '&amp;runId=' + element.testRun.id +
            '&amp;buildId=' + element.build.id +
            '&amp;resultId=' + element.id +
            '&amp;paneView=debug';
    }

    private static buildTestResultTestFields(testType: string): TestResultTestField[] {
        let fields: Array<TestResultTestField> = [];
        let field = new TestResultTestFieldAttributes(TestFieldNames.FRAMEWORK, this.getTestType(testType));
        fields.push(new TestResultTestField(field));
        field = new TestResultTestFieldAttributes(TestFieldNames.TEST_LEVEL, this.getOctaneTestLevelDisplayValue(testType));
        fields.push(new TestResultTestField(field));
        return fields;
    }

    private static getTestType(testType: string) {
        switch (testType) {
            case 'JUnit':
                return Framework.JUNIT;
            case 'Cucumber':
                return Framework.CUCUMBER;
            default:
                return testType;
        }
    }

    private static getOctaneTestLevelDisplayValue(testType: string) {
        switch (testType) {
            case 'JUnit':
                return this.UNIT_OCTANE_TEST_LEVEL_DISPLAY_VALUE;
            case 'Cucumber':
                return this.GHERKIN_OCTANE_TEST_LEVEL_DISPLAY_VALUE;
            default:
                return testType;
        }
    }

    private static getStatus(outcome: string): TestRunStatus {
        switch (outcome) {
            case 'NotExecuted':
                return TestRunStatus.SKIPPED;
            case 'Passed':
                return TestRunStatus.PASSED;
            case 'Failed':
                return TestRunStatus.FAILED;
        }
    }
}