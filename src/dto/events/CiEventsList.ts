import {DtoObject} from '../DtoObject';
import {CiServerInfo} from '../general/CiServerInfo';
import {CiEvent} from './CiEvent';


export class CiEventsList extends DtoObject {
    server: CiServerInfo;
    events: CiEvent[] = [];

    constructor(server: CiServerInfo, events: CiEvent[]) {
        super();
        this.server = server;
        this.events = events;
    }
}