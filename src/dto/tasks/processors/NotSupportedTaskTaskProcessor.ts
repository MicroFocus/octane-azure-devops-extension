import {TaskProcessorResult} from "../TaskProcessorResult";
import {Task} from "../Task";
import {TaskProcessor} from "./TaskProcessor";
import {TaskProcessorContext} from "../TaskProcessorContext";

export class NotSupportedTaskTaskProcessor extends TaskProcessor {
    constructor(context: TaskProcessorContext) {
        super(context);
    }

    public async process(task: Task): Promise<TaskProcessorResult> {
        let status: number = 400;
        this.context.getLogger().info('Unsupported task. Responding with ' + status);

        return Promise.resolve(new TaskProcessorResult(task, status, null));
    }
}