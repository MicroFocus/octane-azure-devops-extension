import {DtoObject} from '../DtoObject';
import {GherkinStepData} from './GherkinStepData';

export class GherkinStepsWrapper extends DtoObject {
    step: GherkinStepData[] | GherkinStepData;

    constructor(step: GherkinStepData[] | GherkinStepData) {
        super();
        this.step = step
    }
}