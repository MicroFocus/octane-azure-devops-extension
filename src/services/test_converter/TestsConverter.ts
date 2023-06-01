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

        let testToRunData = this.parsTests(testToConverts);

        let testsConvertedStr = "";
        switch (framework) {
            case 'mvnSurefire':
            case 'testNG':
            case 'junit':
                testsConvertedStr =this.handleJunitOrTestNgFramework(testToRunData);
                break;
            case 'uft':
                break;
            case 'mbt':
                break;
            case 'cucumber':
                break;
            case 'bddScenario':
                break;
            case 'jbehave': //"{\"testPattern\": \"$featureFilePath\",\"testDelimiter\": \",\"}";
                break;
            case 'protractor': //"{\"testPattern\":\"$class $testName\",\"testDelimiter\":\"|\"}";
                break;
            case 'gradle': //"{\"testPattern\":\" --tests $package.$class.$testName\",\"testDelimiter\":\"\"}";
                break;
            case 'custom':
                break;
        }

        return testsConvertedStr;
    }

    private handleJunitOrTestNgFramework(testToRunData : Array<TestToRunData>) {

        let testMap = {};
        testToRunData?.forEach(testData =>{

            const fullPath =
                testData.getPackageName() ? testData.getPackageName() + '.' + testData.getClassName() : testData.getClassName();
            if(testMap[fullPath]) {
                testMap[fullPath] = testMap[fullPath] + '+' + testData.getTestName();
            } else {
                testMap[fullPath] = testData.getTestName();
            }

        });
        const testConverted = Object.keys(testMap)
            .map(key => key +'#' + testMap[key])
            .join(',');

        this.logger.info("testConverted is "+ testConverted);
        return testConverted;
    }

    // Example: --tests package1.className1.testName1 --tests package2.className2.testName2
    private handleGradleFramework() {

    }

    // Example: className1 testName1|className2 testName2
    private handleProtractorFramework() {

    }

    // Example: --name '^testName1$' --name '^testName2$'
    private handleBddOrCucumberFramework() {

    }

    // Example: $featureFilePath,$featureFilePath
    private handleJbehaveFramework() {

    }

    private parsTests(testsToConvert : string){

        //testToConverts format: v1:package1|class1|test1|key1=val1|key2=val2;package2|class2|test2#arguments2;package3|class3|test3#arguments3
        let TEST_PARTS_MINIMAL_SIZE = 3;
        let PARAMETER_SIZE = 2;

        testsToConvert = testsToConvert.slice(testsToConvert.indexOf(":") + 1);

        if(testsToConvert){
            //split to separated test
            const testsList = testsToConvert.split(";");
            let testToRunList = new Array<TestToRunData>();
            testsList?.forEach(test =>{
                const testSplit = test.split("|");  //example: package1|class1|test1|key1=val1|key2=val2;
                if(testSplit.length < TEST_PARTS_MINIMAL_SIZE){
                    this.logger.error("Test '" + test + "' does not contains all required components");
                }

                let testToRunData: TestToRunData;
                testToRunData = new TestToRunData(testSplit[0], testSplit[1], testSplit[2]);
                //add parameters
                for(let i = TEST_PARTS_MINIMAL_SIZE; i < testsList.length; i++){
                    let paramSplit =  testsList[i].split("=")
                    if(paramSplit.length != PARAMETER_SIZE){
                        //throw an exception
                    } else {
                        testToRunData.addParameters(paramSplit[0], paramSplit[1]);
                    }
                }
                this.logger.info("test data:"+ testToRunData.toStringRow());
                testToRunList.push(testToRunData);
            });
            return testToRunList;
        }

        return null;
    }

    private getFeatureFilePath(item : TestToRunData) {
    return item.getParameter('featureFilePath');
}

    private JunitConverter(){

    }

    private GradleConverter(){

    }

}