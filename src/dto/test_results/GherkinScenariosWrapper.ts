import {DtoObject} from '../DtoObject';
import {GherkinScenarioData} from './GherkinScenarioData';

export class GherkinScenariosWrapper extends DtoObject {
    scenario: GherkinScenarioData[] | GherkinScenarioData;

    constructor(scenario: GherkinScenarioData[] | GherkinScenarioData) {
        super();
        this.scenario = scenario;
    }
}