import { BaseTask } from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType, Result} from "./dto/events/CiTypes";

export class EndTask extends BaseTask {
    private constructor(tl: any) {
       super(tl);
    }

    public static async instance(tl: any): Promise<EndTask> {
        let task = new EndTask(tl);
        await task.init();
        return task;
    }

    public async run() {
        let endEvent = new CiEvent(this.buildName, CiEventType.FINISHED, this.buildName, this.buildId, this.projectName, Result.SUCCESS, new Date().getTime(), 10000000, 10, null, PhaseType.POST);
        await this.sendEvent(endEvent);
    }
}