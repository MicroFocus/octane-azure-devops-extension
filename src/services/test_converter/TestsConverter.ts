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
        let testToRunData = this.parsTests(testToConverts);

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
    private handleCucumberJVM(testsToRunData : Array<TestToRunData>){

        let testsConvertedStr = "";
        let classJoiner = "";

        testsToRunData.forEach(function(item, index) {
            testsConvertedStr =testsConvertedStr + classJoiner + "'" +this.getFeatureFilePath(item) + "'";
            classJoiner = " ";
        });

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


    //original srt :"v1:||No Results in Search|runId=3985071|featureFilePath=src\test\resources\F1\Add Widget Gallery - Widget_36002.feature;||Search is done for each category|runId=3985072|featureFilePath=src\test\resources\F1\Add Widget Gallery - Widget_36002.feature
    //converted: 'src\test\resources\F1\Add Widget Gallery - Widget_36002.feature' --name '^No Results in Search$' --name '^Search is done for each category$'
    private handleBddScenarioFramework(testToRunData : Array<TestToRunData>) {

        let featuresStr = testToRunData.map(d => this.getFeatureFilePath(d))
            .filter(d => d!= null && d !== "")
            .map(n => "'"+ n +"'")
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(" ");

        //let featuresStrDistinct = featuresStr.filter((value, index, array) => array.indexOf(value) === index).join(" ");

        let testsStr = testToRunData.map(d => d.getTestName().replace("'","."))
            .map(n => "--name '^" + n + "$'")
            .filter((value, index, array) => array.indexOf(value) === index)//distinct
            .join(" ")

        return featuresStr + " " + testsStr;

        /*
         String featuresStr = data.stream()
                .map(d -> getFeatureFilePath(d)).filter(d -> d != null && !d.isEmpty())
                .distinct()
                .map(n -> "'" + n + "'")
                .collect(Collectors.joining(" "));
        String testsStr = data.stream()
                .map(d -> d.getTestName().replace("'","."))
                .map(n -> "--name '^" + n + "$'")
                .distinct()
                .collect(Collectors.joining(" "));
        return featuresStr + " " + testsStr;
         */
    }

    private getFeatureFilePath(item: TestToRunData) {
        return item.getParameter('featureFilePath');
    }
    private parsTests(testsToConvert : string) {

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

                let testToRunData: TestToRunData;
                testToRunData = new TestToRunData(testSplit[0], testSplit[1], testSplit[2]);
                //add parameters
                for (let i = TEST_PARTS_MINIMAL_SIZE; i < testsList.length; i++) {
                    let paramSplit = testsList[i].split("=")
                    if (paramSplit.length != PARAMETER_SIZE) {
                        //throw an exception
                    } else {
                        testToRunData.addParameters(paramSplit[0], paramSplit[1]);
                    }
                }
                this.logger.info("test data:" + testToRunData.toStringRow());
                testToRunList.push(testToRunData);
            });
            return testToRunList;
        }

        return null;
    }
}