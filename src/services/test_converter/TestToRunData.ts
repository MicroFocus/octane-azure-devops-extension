
export class TestToRunData {


    private readonly testName : string;
    private readonly className : string;
    private readonly packageName : string;
    private  parameters : Map<string, string>

    constructor(packageName: string ,className: string, testName: string ){
        this.testName = testName;
        this.className = className;
        this.packageName = packageName;
    }

    public addParameters(key : string, value : string) {
        if (this.parameters == null) {
            this.parameters = new Map<string, string>();
        }
        this.parameters.set(key, value);
        return this;
    }

    public getParameter(key : string){
        return this.parameters.get(key);
    }

    public getTestName(){
        return this.testName;
    }

    public getClassName(){
        return this.className;
    }

    public getPackageName(){
        return this.packageName;
    }
    public toStringRow(){
        return this.className+ "." + this.packageName +"." +this.testName;
    }
}