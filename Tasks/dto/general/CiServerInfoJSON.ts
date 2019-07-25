import { DtoJsonObject } from "../DtoJsonObject";

export interface CiServerInfoJSON extends DtoJsonObject {
    type: string;
    version: string;
    url: string;
    instanceId: string;
    instanceIdFrom: number;
    sendingTime: number;
}
