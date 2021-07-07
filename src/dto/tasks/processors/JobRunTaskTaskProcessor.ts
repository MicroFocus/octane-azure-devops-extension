import {TaskProcessorResult} from "../TaskProcessorResult";
import {Task} from "../Task";
import {TaskProcessor} from "./TaskProcessor";
import {TaskProcessorContext} from "../TaskProcessorContext";
import {AzurePipelinesService} from "../../../services/pipelines/AzurePipelinesService";

export class JobRunTaskTaskProcessor extends TaskProcessor {
    constructor(context: TaskProcessorContext) {
        super(context);
    }

    public async process(task: Task): Promise<TaskProcessorResult> {

        return await AzurePipelinesService.run(task, this.context.getTL(),
            this.context.getAuthenticationService().getAzureAccessToken(), this.context.getLogger());
    }
}