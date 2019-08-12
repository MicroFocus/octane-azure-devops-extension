import {DtoObject} from '../DtoObject';

export class TestResultBuildAttributes extends DtoObject {
    build_id: string;
    job_id: string;
    server_id: string;

    constructor(server_id: string, job_id: string, build_id: string) {
        super();
        this.server_id = server_id;
        this.job_id = job_id;
        this.build_id = build_id;
    }
}