import {JobRunTaskTaskProcessor} from "./processors/JobRunTaskTaskProcessor";
import {JobType} from "./JobType";
import {TaskType} from "./TaskType";
import {Task} from "./Task";
import {NotSupportedTaskTaskProcessor} from "./processors/NotSupportedTaskTaskProcessor";
import {TaskProcessorContext} from "./TaskProcessorContext";

export class TaskProcessorsFactory {
    public static getTaskProcessor(task: Task, context: TaskProcessorContext) {
        if(task.taskType == TaskType.JOBS && task.jobType == JobType.RUN) {
            return new JobRunTaskTaskProcessor(context);
        }

        return new NotSupportedTaskTaskProcessor(context);
    }
}