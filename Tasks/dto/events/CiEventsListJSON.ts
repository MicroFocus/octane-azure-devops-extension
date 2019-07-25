import { DtoJsonObject } from "../DtoJsonObject";
import { CiServerInfo } from "../general/CiServerInfo";
import { CiEvent } from "./CiEvent";

export interface CiEventsList extends DtoJsonObject {
    server: CiServerInfo;
    events: CiEvent[];
}