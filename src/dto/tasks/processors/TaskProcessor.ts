import {Task} from "../Task";
import {TaskProcessorResult} from "../TaskProcessorResult";
import {TaskProcessorContext} from "../TaskProcessorContext";

export abstract class TaskProcessor {
    protected context: TaskProcessorContext;

    protected constructor(context: TaskProcessorContext) {
        this.context = context;
    }

    public async abstract process(task: Task): Promise<TaskProcessorResult>;
}