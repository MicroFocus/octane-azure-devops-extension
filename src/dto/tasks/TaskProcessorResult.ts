import {Task} from "./Task";

export class TaskProcessorResult {
    public task: Task;
    public status: number;
    public result: any;

    constructor(task: Task, status: number, result: any) {
        this.task = task;
        this.status = status;
        this.result = result;
    }
}