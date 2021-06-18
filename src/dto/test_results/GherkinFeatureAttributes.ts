import {DtoObject} from "../DtoObject";

export class GherkinFeatureAttributes extends DtoObject {
    name: string;
    path: string;
    started: number;
    tag: string;

    constructor(name: string, path: string, started: number, tag: string) {
        super();
        this.name = name;
        this.path = path;
        this.started = started;
        this.tag = tag;
    }
}