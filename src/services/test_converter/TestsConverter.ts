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
import {LogUtils} from "../../LogUtils";
import {TestToRunData} from "./TestToRunData";

export class TestsConverter {
    private readonly logger: LogUtils;
    private readonly tl: any;

    constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
        this.logger.debug("ALMOctaneLogLevel: " + logLevel);

    }

    public convert(testToConverts :string, framework:string) {

        this.logger.info("testToConverts is: "+ testToConverts);
        const testToRunData = this.parseTests(testToConverts);

        let testsConvertedStr = "";
        switch (framework) {
            case 'mvnSurefire':
            case 'testNG':
            case 'junit':
                testsConvertedStr =this.handleJunitOrTestNgFramework(testToRunData);
                break;
            case 'cucumber':
                testsConvertedStr = this.handleCucumberJVM(testToRunData);
                break;
            case 'bddScenario':
                testsConvertedStr =this.handleBddScenarioFramework(testToRunData);
                break;
            default:
                this.logger.info("can't convert the tests, no supported framework is selected.")
                break;
        }

        this.logger.info("converted Tests is: "+ testsConvertedStr);
        return testsConvertedStr;
    }

    //original srt: v1:||Approve2222|runId=4174127|featureFilePath=src\test\resources\F1\test_1001.feature;||numberStatus|runId=4174128|featureFilePath=src\test\resources\F1\test_1001.feature
    //converted:'src\test\resources\F1\test_1001.feature' 'src\test\resources\F1\test_1001.feature'
    private handleCucumberJVM(testsToRunData : TestToRunData[]){

        const testsConvertedStr = testsToRunData.filter(item => item.parameters['featureFilePath'])
            .map(item => '\\"' + item.parameters['featureFilePath'] +'\\"')
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(' ')
        console.log('test to run converter :' + testsConvertedStr);

        return testsConvertedStr;
    }

    private handleJunitOrTestNgFramework(testToRunData : TestToRunData[]) {

        let testMap = {};
        testToRunData?.forEach(testData =>{

            const fullPath =
                testData.packageName ? testData.packageName + '.' + testData.className : testData.className;
            if(testMap[fullPath]) {
                testMap[fullPath] = testMap[fullPath] + '+' + testData.testName;
            } else {
                testMap[fullPath] = testData.testName;
            }

        });
        const testConverted = Object.keys(testMap)
            .map(key => key +'#' + testMap[key])
            .join(',');

        this.logger.info("testConverted is "+ testConverted);
        return testConverted;
    }


    //original srt :"v1:||No Results in Search|runId=3985071|featureFilePath=src\test\resources\F1\Add Widget Gallery - Widget_36002.feature;||Search is done for each category|runId=3985072|featureFilePath=src\test\resources\F1\Add Widget Gallery - Widget_36002.feature
    //converted: 'src\test\resources\F1\Add Widget Gallery - Widget_36002.feature' --name '^No Results in Search$' --name '^Search is done for each category$'
    private handleBddScenarioFramework(testsToRunData : Array<TestToRunData>) {

        const featuresStr = testsToRunData.filter(item => item.parameters['featureFilePath'])
            .map(item => "'" + item.parameters['featureFilePath'] +"'")
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(" ");

        const testsStr = testsToRunData.map(item => item.testName.replace("'","."))
            .map(n => "--name '^" + n + "$'")
            .filter((value, index, array) => array.indexOf(value) === index)//distinct
            .join(" ")

        return featuresStr + " " + testsStr;
    }

    private parseTests(testsToConvert : string): TestToRunData[] {

        //testToConverts format: v1:package1|class1|test1|key1=val1|key2=val2;package2|class2|test2#arguments2;package3|class3|test3#arguments3
        let TEST_PARTS_MINIMAL_SIZE = 3;
        let PARAMETER_SIZE = 2;

        testsToConvert = testsToConvert.slice(testsToConvert.indexOf(":") + 1);

        if (testsToConvert) {
            //split to separated test
            const testsList = testsToConvert.split(";");
            let testToRunList = new Array<TestToRunData>();
            testsList?.forEach(test => {
                const testSplit = test.split("|");  //example: package1|class1|test1|key1=val1|key2=val2;
                if (testSplit.length < TEST_PARTS_MINIMAL_SIZE) {
                    this.logger.error("Test '" + test + "' does not contains all required components");
                }

                const testToRunData:TestToRunData = {
                    packageName: testSplit[0],
                    className: testSplit[1],
                    testName:testSplit[2],
                }
                if(testSplit.length > TEST_PARTS_MINIMAL_SIZE){
                    testToRunData.parameters = {}
                }
                //add parameters
                for (let i = TEST_PARTS_MINIMAL_SIZE; i < testSplit.length; i++) {
                    let paramSplit = testSplit[i].split("=")
                    if (paramSplit.length != PARAMETER_SIZE) {
                        //throw an exception
                    } else {

                        testToRunData.parameters[paramSplit[0]] = paramSplit[1];
                    }
                }
                this.logger.info('test data:' + testToRunData.packageName + '.' + testToRunData.className + '.' + testToRunData.testName +
                    ', parameters: ' + testToRunData.parameters && Object.keys(testToRunData.parameters).map(param => param +'=' + testToRunData.parameters[param]).join(','));


                testToRunList.push(testToRunData);
            });
            return testToRunList;
        }

        return null;
    }
}