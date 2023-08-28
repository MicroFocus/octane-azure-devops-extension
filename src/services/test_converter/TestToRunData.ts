
export interface TestToRunData {
    testName : string;
    className : string;
    packageName : string;
    parameters?: {[parameterName:string]:string};
}