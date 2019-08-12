import {DtoObject} from '../DtoObject';

export class CiServerInfo extends DtoObject {
    type: string;
    version: string;
    url: string;
    instanceId: string;
    instanceIdFrom: number;
    sendingTime: number;

    constructor(type: string, version: string, url: string, instance_id: string, instance_id_from: number, sending_time: number) {
        super();
        this.type = type;
        this.version = version;
        this.url = url;
        this.instanceId = instance_id;
        this.instanceIdFrom = instance_id_from;
        this.sendingTime = sending_time;
    }
}