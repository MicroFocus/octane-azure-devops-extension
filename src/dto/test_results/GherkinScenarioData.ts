import {DtoObject} from '../DtoObject';
import {GherkinScenarioAttributes} from './GherkinScenarioAttributes';
import {GherkinStepsWrapper} from './GherkinStepsWrapper';

export class GherkinScenarioData extends DtoObject {
    _attributes: GherkinScenarioAttributes;
    steps: GherkinStepsWrapper;

    constructor(attributes: GherkinScenarioAttributes, steps: GherkinStepsWrapper) {
        super();
        this._attributes = attributes;
        this.steps = steps;
    }
}