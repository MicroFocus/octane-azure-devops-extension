import { DtoJsonObject } from  "./DtoJsonObject";

export class DtoObject {

    toJSON(): DtoJsonObject {
        return Object.assign({}, this);
    }

    static fromJSON(json: DtoJsonObject | string): DtoObject {
        if (typeof json === 'string') {
            return JSON.parse(json, DtoObject.reviver);
        } else {
            let obj = Object.create(DtoObject.prototype);
            return Object.assign(obj, json);
        }
    }

    static reviver(key: string, value: any): any {
        return key === "" ? DtoObject.fromJSON(value) : value;
    }
}
