import {CiEventType, PhaseType, Result} from './CiTypes';
import {CiEventCause} from './CiEventCause';
import {ScmData} from '../scm/ScmData';
import {DtoObject} from '../DtoObject';

export class CiEvent extends DtoObject {
    projectDisplayName: string;
    eventType: CiEventType;
    buildCiId: string;
    number: string;
    project: string;
    result: Result;
    startTime: number;
    estimatedDuration: number;
    duration: number;
    scmData: ScmData;
    phaseType: PhaseType;
    causes: CiEventCause[];
    parameters: any[] = [];

    constructor(project_display_name: string, ci_event_type: CiEventType, build_ci_id: string, number: string, project: string, result: Result,
                start_time: number, estimated_duration?: number, duration?: number, scm_data?: ScmData, phase_type?: PhaseType, causes?: CiEventCause[], parameters?: any[]) {
        super();
        this.projectDisplayName = project_display_name;
        this.eventType = ci_event_type;
        this.buildCiId = build_ci_id;
        this.number = number;
        this.project = project;
        this.result = result;
        this.startTime = start_time;
        this.estimatedDuration = estimated_duration;
        this.duration = duration;
        this.scmData = scm_data;
        this.phaseType = phase_type;
        this.causes = causes;
        this.parameters = parameters;
    }
}