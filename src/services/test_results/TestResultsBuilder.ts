import {TestResultUnitTestRunAttributes} from '../../dto/test_results/TestResultUnitTestRunAttributes';
import {Framework, TestFieldNames, TestRunResults} from '../../dto/test_results/TestResultEnums';
import {TestResultErrorAttributes} from '../../dto/test_results/TestResultErrorAttributes';
import {TestResultBuildAttributes} from '../../dto/test_results/TestResultBuildAttributes';
import {TestResultTestFieldAttributes} from '../../dto/test_results/TestResultTestFieldAttributes';
import {TestResult} from '../../dto/test_results/TestResult';
import {TestResultTestField} from '../../dto/test_results/TestResultTestField';
import {TestResultUnitTestRunElement} from '../../dto/test_results/TestResultUnitTestRunElement';
import {TestResultError} from '../../dto/test_results/TestResultError';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as ta from 'azure-devops-node-api/TestApi';
import {TestCaseResult} from "azure-devops-node-api/interfaces/TestInterfaces";
import {LogUtils} from "../../LogUtils";
import {TestResultGherkinTestRunElement} from "../../dto/test_results/TestResultGherkinTestRunElement";
import {TestResultGherkinTestRunAttributes} from "../../dto/test_results/TestResultGherkinTestRunAttributes";
import {GherkinTestResultData} from "../../dto/test_results/GherkinTestResultData";

let convert = require('xml-js');
let xmlescape = require('xml-escape');
const globby = require('globby');
const {readFileSync} = require('fs-extra');

export class TestResultsBuilder {

    public static buildUnitTestResult(testResults: any, server_id: string, job_id: string, logger: LogUtils): TestResult {
        if (!testResults || !testResults.length) {
            logger.info('No unit test results were retrieved/found');
            return null;
        }
        let testResultTestRuns = this.buildUnitTestResultTestRun(testResults, logger);
        let testResultTestFields = this.buildTestResultTestFields(testResults[0].automatedTestType);
        let testResultBuild = this.buildTestResultBuild(server_id, job_id, testResults[0].build.id);
        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    public static buildGherkinTestResult(testResults: GherkinTestResultData[], server_id: string, job_id: string, build_id: string, logger: LogUtils): TestResult {
        if (!testResults || !testResults.length) {
            logger.info('No gherkin test results were retrieved/found');
            return null;
        }
        let testResultTestRuns = this.buildGherkinTestResultTestRun(testResults, logger);
        let testResultTestFields = this.buildTestResultTestFields("Cucumber");
        let testResultBuild = this.buildTestResultBuild(server_id, job_id, build_id);
        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    public static getUnitTestResultXml(testResults: any, server_id: string, job_id: string, logger: LogUtils): any {
        let result: TestResult = TestResultsBuilder.buildUnitTestResult(testResults, server_id, job_id, logger);
        let options = {compact: true, ignoreComment: true, spaces: 4};
        let convertedXml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><test_result>' + convert.js2xml(result, options) + '</test_result>';
        logger.info('Test results converted for Octane');
        logger.debug(convertedXml);
        return convertedXml;
    }

    public static getGherkinTestResultXml(testResults: GherkinTestResultData[], server_id: string, job_id: string, build_id: string, logger: LogUtils): any {
        let result: TestResult = TestResultsBuilder.buildGherkinTestResult(testResults, server_id, job_id, build_id, logger);
        let options = {compact: true, ignoreComment: true, spaces: 4};
        let convertedXml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><test_result>' + convert.js2xml(result, options) + '</test_result>';
        logger.info('Test results converted for Octane');
        logger.debug(convertedXml);
        return convertedXml;
    }

    public static async getTestsResultsByBuildId(connection: WebApi, projectName: string, buildId: number, serverId: string, jobId: string, cucumberReportsPath: string, logger: LogUtils): Promise<string[]> {
        let xmlTestResults: string[] = [];
        let gherkinResults: GherkinTestResultData[] = [];

        const inputPath = cucumberReportsPath.replace(/\\/g, '/')
        const files = globby.sync([`${inputPath}/*.xml`])
        console.log(`Found ${files.length} matching ${inputPath} pattern`)

        let options = {compact: true, ignoreComment: true, spaces: 4};

        files.forEach(filePath => {
            console.log(`Processing ${filePath}`)
            const rawContent = readFileSync(filePath, 'utf-8')
            const featuresAsJson = convert.xml2js(rawContent, options);
            const features = featuresAsJson.features.feature;
            if (Array.isArray(features)) {
                features.forEach(feat => gherkinResults.push(new GherkinTestResultData(feat)));
            } else {
                gherkinResults.push(new GherkinTestResultData(features));
            }
        });

        if (gherkinResults.length > 0) {
            xmlTestResults.push(TestResultsBuilder.getGherkinTestResultXml(gherkinResults, serverId, jobId, buildId.toString(), logger))
        }

        let processedTests: Set<string> = new Set();

        gherkinResults.forEach(gherkinRes => {
            let scenarios = gherkinRes.feature.scenarios.scenario;
            if (Array.isArray(scenarios)) {
                scenarios.forEach(scenario => processedTests.add(scenario._attributes.name));
            } else {
                processedTests.add(scenarios._attributes.name);
            }
        });

        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let build = await buildApi.getBuild(projectName, buildId);
        let buildURI = build.uri;
        let testApi: ta.ITestApi = await connection.getTestApi();
        let testRuns = await testApi.getTestRuns(projectName, buildURI);
        if (testRuns.length > 0) {
            let results: TestCaseResult[] = [];
            for (let i = 0; i < 1; i++) {
                let testRunId = testRuns[i].id;
                results = results.concat(await testApi.getTestResults(projectName, testRunId));
            }
            results = results.filter(result => !processedTests.has(result.automatedTestName))
            if (results.length > 0) {
                xmlTestResults.push(TestResultsBuilder.getUnitTestResultXml(results, serverId, jobId, logger));
            }
        } else {
            logger.info('No unit test results found');
        }

        return xmlTestResults;
    }

    private static buildUnitTestResultTestRun(testResults: any, logger: LogUtils): TestResultUnitTestRunElement[] {
        let testResultTestRunList: Array<TestResultUnitTestRunElement> = [];
        testResults.forEach(element => {
            let packagename = element.automatedTestStorage;
            if (packagename.length > 255) {
                logger.error("Package name is longer than 255 chars: " + packagename);
                return;
            }
            let name = element.automatedTestName;
            if (name.length > 255) {
                logger.error("Test name is longer than 255 chars: " + name);
                return;
            }
            let classname = packagename + '.' + name;
            if (classname.length > 255) {
                logger.error("Classname name is longer than 255 chars: " + classname);
                return;
            }
            let duration = element.durationInMs || 0;
            let status = this.getStatus(element.outcome);
            let started = Date.parse(element.startedDate);
            let external_report_url = this.buildReportUrl(element);
            let error;
            if (status === TestRunResults.FAILED) {
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
            let testResultElem = new TestResultUnitTestRunElement(new TestResultUnitTestRunAttributes(undefined, packagename, name, classname, duration,
                status, started, external_report_url), error);

            testResultTestRunList.push(testResultElem);
        });
        return testResultTestRunList;
    }

    private static buildGherkinTestResultTestRun(testResults: GherkinTestResultData[], logger: LogUtils): TestResultGherkinTestRunElement[] {
        let testResultTestRunList: Array<TestResultGherkinTestRunElement> = [];
        testResults.forEach(element => {
            let name = element.feature._attributes.name;
            if (name.length > 255) {
                logger.error("Test name is longer than 255 chars: " + name);
                return;
            }

            let scenarios = element.feature.scenarios.scenario;
            let duration = 0;
            let status = "Passed";

            let scenarioArray = [];
            if (Array.isArray(scenarios)) {
                scenarioArray = scenarios;
            } else {
                scenarioArray.push(scenarios);
            }

            scenarioArray.forEach(scenario => {
                let steps: any[] = scenario.steps.step;
                scenario._attributes.status = "Passed";
                steps.forEach(step => {
                    duration += parseInt(step._attributes.duration);
                    if (step._attributes.status == "failed") {
                        status = "Failed";
                        scenario._attributes.status = "Failed"
                    }
                });
            });

            const testFinalStatus: TestRunResults = this.getStatus(status);

            let testResultElem = new TestResultGherkinTestRunElement(new TestResultGherkinTestRunAttributes(name, duration, testFinalStatus), element);
            testResultTestRunList.push(testResultElem);
        });

        return testResultTestRunList;
    }

    private static buildReportUrl(element: any): string {
        return element.project.url.split('_apis')[0] + element.project.name + '/_build/results?view=ms.vss-test-web.build-test-results-tab' +
            '&amp;runId=' + element.testRun.id +
            '&amp;buildId=' + element.build.id +
            '&amp;resultId=' + element.id +
            '&amp;paneView=debug';
    }

    private static buildTestResultBuild(server_id: string, job_id: string, build_id: string): TestResultBuildAttributes {
        return new TestResultBuildAttributes(server_id, job_id, build_id);
    }

    private static buildTestResultTestFields(testType: string): TestResultTestField[] {
        let fields: Array<TestResultTestField> = [];
        let field = new TestResultTestFieldAttributes(TestFieldNames.FRAMEWORK, this.getTestType(testType));
        fields.push(new TestResultTestField(field));
        field = new TestResultTestFieldAttributes(TestFieldNames.TEST_LEVEL, this.getTestLevel(testType));
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

    private static getTestLevel(testType: string) {
        switch (testType) {
            case 'JUnit':
                return "Unit Test";
            case 'Cucumber':
                return "Gherkin Test";
            default:
                return testType;
        }
    }

    private static getStatus(outcome: string): TestRunResults {
        switch (outcome) {
            case 'NotExecuted':
                return TestRunResults.SKIPPED;
            case 'Passed':
                return TestRunResults.PASSED;
            case 'Failed':
                return TestRunResults.FAILED;
        }
    }
}