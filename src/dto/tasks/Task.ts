import {TaskType} from "./TaskType";
import {JobType} from "./JobType";
import {OctaneTaskConstants} from "../../ExtensionConstants";
import {LogUtils} from "../../LogUtils";

export class Task {
    public headers: any;
    public method: string;
    public id: string;
    public serviceId: string;
    public body: any;
    public url: string;
    public jobCiId: string;
    public taskType: TaskType;
    public jobType: JobType;

    private constructor() {

    }

    public static from(taskData: any, logger: LogUtils) {
        let task: Task = new Task();

        task.headers = taskData.headers;
        task.method = taskData.method;
        task.id = taskData.id;
        task.serviceId = taskData.serviceId;
        task.body = taskData.body;
        task.url = taskData.url;
        task.taskType = TaskType.UNDEFINED;
        task.jobType = JobType.UNDEFINED;
        task.jobCiId = '';

        if(task.url.includes(OctaneTaskConstants.NGA_API)) {
            let ngaApiParts = task.url.split(OctaneTaskConstants.NGA_API);
            if(ngaApiParts.length == 2) {
                let taskParts = ngaApiParts[1].split('/');
                if(taskParts.length == 3) {
                    // Currently this is the only functionality we support
                    if(taskParts[0].toUpperCase() == TaskType.JOBS && taskParts[2].toUpperCase() == JobType.RUN) {
                        task.taskType = TaskType.JOBS;
                        task.jobCiId = taskParts[1];
                        task.jobType = JobType.RUN;
                    }
                }
            }
        } else {
            logger.error('task \'URL\' expected to contain \'' + OctaneTaskConstants.NGA_API + '\'; wrong handler call?');
        }

        return task;
    }
}