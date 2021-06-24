import {DtoObject} from '../DtoObject';
import {GherkinScriptFile} from './GherkinScriptFile';
import {GherkinFeatureAttributes} from './GherkinFeatureAttributes';
import {GherkinScenariosWrapper} from './GherkinScenariosWrapper';

export class GherkinFeatureData extends DtoObject {
    _attributes: GherkinFeatureAttributes;
    file: GherkinScriptFile;
    scenarios: GherkinScenariosWrapper;

    constructor(attributes: GherkinFeatureAttributes, file: GherkinScriptFile, scenarios: GherkinScenariosWrapper) {
        super();
        this._attributes = attributes;
        this.file = file;
        this.scenarios = scenarios;
    }
}