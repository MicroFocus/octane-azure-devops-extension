import {DtoObject} from '../DtoObject';


export class ScmRepository extends DtoObject {
    private type: string;
    private url: string;
    private branch: string;

    constructor(type: string, url: string, branch: string) {
        super();
        this.type = 'git';
        this.branch = branch;
        this.url = url;
    }

}