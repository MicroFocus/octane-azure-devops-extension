import {TestResultsBuilder} from './TestResultsBuilder';
import {LogUtils} from "../LogUtils";

let convert = require('xml-js');
const fs = require('fs');

const xml = fs.readFileSync('TEST_SnapshotsServiceIT.xml', 'utf-8');
const results = fs.readFileSync('AzureTestResults.txt', 'utf-8');
let jsonObjectResults = JSON.parse(results);


// let result : TestResult = TestResultsBuilder.buildTestResult(jsonObjectResults, 'my_server_is', 'my_job_id');
//
// let  options = {compact: true, ignoreComment: true, spaces: 4};
// let convertedXml =  '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' + convert.json2xml(result.toJSON(),options);
// console.log(convertedXml);

let result = TestResultsBuilder.getTestResultXml(jsonObjectResults, 'my_server_is', 'my_job_id', new LogUtils('debug'));






