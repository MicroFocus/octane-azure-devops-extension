import {DtoObject} from "../DtoObject";
import {CiEvent} from "./CiEvent";
import {CiEventType, PhaseType, Result} from "./CiTypes";
import {ScmData} from "../scm/ScmData";
import {CiEventCause} from "./CiEventCause";

export class TestExecutionEvent extends CiEvent {
    executionId: string;
    suiteRunId: string;

    constructor(project_display_name: string, ci_event_type: CiEventType, build_ci_id: string, number: string,
                project: string, result: Result, start_time: number, executionId: string, suiteRunId: string,
                estimated_duration?: number, duration?: number, scm_data?: ScmData, phase_type?: PhaseType,
                causes?: CiEventCause[], parameters?: any[],multiBranchType?:string ,parentCiId?:string, branch?:string) {
        super(project_display_name, ci_event_type, build_ci_id, number, project, result,
            start_time, estimated_duration, duration, scm_data, phase_type, causes,
            parameters,multiBranchType ,parentCiId, branch);
        this.executionId = executionId;
        this.suiteRunId = suiteRunId;
    }
}