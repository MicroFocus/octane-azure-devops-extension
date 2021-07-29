import {DtoObject} from '../DtoObject';
import {GherkinFeatureData} from './GherkinFeatureData';
import {GherkinResultAttributes} from './GherkinResultAttributes';
import {GherkinScenarioData} from './GherkinScenarioData';
import {TestRunStatus} from './TestResultEnums';
import {GherkinStepData} from './GherkinStepData';

export class GherkinResultData extends DtoObject {
    _attributes: GherkinResultAttributes
    feature: GherkinFeatureData;

    constructor(feature: GherkinFeatureData) {
        super();
        this.feature = feature;

        let name = feature._attributes.name;

        let scenarioElement = feature.scenarios.scenario;
        let scenarios = Array.isArray(scenarioElement) ? scenarioElement : Array.of(scenarioElement);

        let {duration, status} = GherkinResultData.determineDurationAndStatusFromScenarios(scenarios);
        this._attributes = new GherkinResultAttributes(name, duration, status);
    }

    private static determineDurationAndStatusFromScenarios(scenarios: GherkinScenarioData[]) {
        let duration: number = 0;
        let status: TestRunStatus = TestRunStatus.PASSED;
        const nanoToMiliDiff: number = 1000000;

        scenarios.forEach(scenario => {
            let steps: GherkinStepData[] = Array.isArray(scenario.steps.step)
                ? scenario.steps.step
                : Array.of(scenario.steps.step);
            scenario._attributes.status = 'Passed';
            steps.forEach(step => {
                let durationInMillis: number = parseInt(step._attributes.duration.toString()) / nanoToMiliDiff;
                step._attributes.duration = Math.round(durationInMillis);
                duration += durationInMillis;
                if (step._attributes.status == 'failed') {
                    status = TestRunStatus.FAILED;
                    scenario._attributes.status = 'Failed'
                }
            });
        });

        duration = Math.round(duration);

        return {duration, status};
    }
}