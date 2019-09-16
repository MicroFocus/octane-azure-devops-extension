import {TestResultTestRunAttributes} from '../dto/test_results/TestResultTestRunAttributes';
import {Framework, TestFieldNames, TestRunResults} from '../dto/test_results/TestResultEnums';
import {TestResultErrorAttributes} from '../dto/test_results/TestResultErrorAttributes';
import {TestResultBuildAttributes} from '../dto/test_results/TestResultBuildAttributes';
import {TestResultTestFieldAttributes} from '../dto/test_results/TestResultTestFieldAttributes';
import {TestResult} from '../dto/test_results/TestResult';
import {TestResultTestField} from '../dto/test_results/TestResultTestField';
import {TestResultTestRunElement} from '../dto/test_results/TestResultTestRunElement';
import {TestResultError} from '../dto/test_results/TestResultError';
import {WebApi} from 'azure-devops-node-api';
import * as ba from 'azure-devops-node-api/BuildApi';
import * as ta from 'azure-devops-node-api/TestApi';
import {TestCaseResult} from "azure-devops-node-api/interfaces/TestInterfaces";

let convert = require('xml-js');
let xmlescape = require('xml-escape');

export class TestResultsBuilder {

    public static buildTestResult(testResults: any, server_id: string, job_id: string): TestResult {
        if (!testResults || !testResults.length) {
            console.log('No test results were retrieved/found');
            return null;
        }
        let testResultTestRuns = this.buildTestResultTestRun(testResults);
        let testResultTestFields = this.buildTestResultTestFields(testResults[0].automatedTestType);
        let testResultBuild = this.buildTestResultBuild(server_id, job_id, testResults[0].build.id);
        return new TestResult(testResultBuild, testResultTestFields, testResultTestRuns);
    }

    public static getTestResultXml(testResults: any, server_id: string, job_id: string): any {
        let result: TestResult = TestResultsBuilder.buildTestResult(testResults, server_id, job_id);
        let options = {compact: true, ignoreComment: true, spaces: 4};
        let convertedXml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><test_result>' + convert.js2xml(result, options) + '</test_result>';
        console.log('Test results converted for Octane');
        console.log(convertedXml);
        return convertedXml;
    }

    public static async getTestsResultsByBuildId(connection: WebApi, projectName: string, buildId: number, serverId: string, jobId: string): Promise<string> {
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
            return TestResultsBuilder.getTestResultXml(results, serverId, jobId);
        } else {
            console.log('No test results found');
            return null;
        }
    }

    private static buildTestResultTestRun(testResults: any): TestResultTestRunElement[] {
        let testResultTestRunList: Array<TestResultTestRunElement> = [];
        testResults.forEach(element => {
            let packagename = element.automatedTestStorage;
            let name = element.automatedTestName;
            let classname = packagename + '.' + name;
            let duration = element.durationInMs || 0;
            let status = this.getStatus(element.outcome);
            let started = Date.parse(element.startedDate);
            let external_report_url = element.url;
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
            let testResultElem = new TestResultTestRunElement(new TestResultTestRunAttributes(undefined, packagename, name, classname, duration,
                status, started, external_report_url), error);

            testResultTestRunList.push(testResultElem);
        });
        return testResultTestRunList;
    }

    private static buildTestResultBuild(server_id: string, job_id: string, build_id: string): TestResultBuildAttributes {
        return new TestResultBuildAttributes(server_id, job_id, build_id);
    }

    private static buildTestResultTestFields(testType: string): TestResultTestField[] {
        let fields: Array<TestResultTestField> = [];
        let field = new TestResultTestFieldAttributes(TestFieldNames.FRAMEWORK, this.getTestType(testType));
        fields.push(new TestResultTestField(field));
        //todo check it
        field = new TestResultTestFieldAttributes(TestFieldNames.TEST_LEVEL, 'Unit Test');
        fields.push(new TestResultTestField(field));
        return fields;
    }

    private static getTestType(testType: string) {
        switch (testType) {
            case 'JUnit':
                return Framework.JUNIT;
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