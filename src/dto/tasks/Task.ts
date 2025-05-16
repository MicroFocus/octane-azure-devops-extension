/*
 * Copyright 2020-2025 Open Text
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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