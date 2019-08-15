import {BaseTask} from './BaseTask';
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType} from "./dto/events/CiTypes";
import {WebApi} from "azure-devops-node-api";
import {ConnectionUtils} from "./ConnectionUtils";
import {ScmBuilder} from "./dto/scm/ScmBuilder";

export class StartTask extends BaseTask {
    private constructor(tl: any) {
        super(tl);
    }

    public static async instance(tl: any): Promise<StartTask> {
        let task = new StartTask(tl);
        await task.init();
        return task;
    }

    public async run() {
        let startEvent = new CiEvent(this.buildName, CiEventType.STARTED, this.buildName, this.buildId, this.projectName, null, new Date().getTime(), 10000000, 10, null, PhaseType.POST);
        await this.sendEvent(startEvent);
        let api: WebApi = ConnectionUtils.getWebApiWithProxy(this.collectionUri, this.token);

        let scmData = await ScmBuilder.buildScmData(api, this.projectName, parseInt(this.buildId));
        console.log('########################## finished ###############################');
        console.log(scmData);
        let scmEvent = new CiEvent(this.buildName, CiEventType.SCM, this.buildName, this.buildId, this.projectName, null, new Date().getTime(), 10000000, 10, scmData, PhaseType.POST);
        await this.sendEvent(scmEvent);
    }
}