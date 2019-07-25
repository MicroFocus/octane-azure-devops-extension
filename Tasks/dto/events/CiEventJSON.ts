import { DtoJsonObject } from "../DtoJsonObject";
import { CiEventType, PhaseType, Result } from "./CiTypes";
import { CiEventCause } from "./CiEventCause";
import { ScmData } from "../scm/ScmData";

export interface CiEvent extends DtoJsonObject {
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
    causes: CiEventCause;
    parameters: any[];
}