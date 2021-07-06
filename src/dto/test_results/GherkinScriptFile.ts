import {DtoObject} from '../DtoObject';

export class GherkinScriptFile extends DtoObject {
    _cdata: string;

    constructor(script: string) {
        super();
        this._cdata = script;
    }
}