/*
 * Copyright 2020-2023 Open Text
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
import {WebApi} from "azure-devops-node-api";
import {CiEventCause} from "../../dto/events/CiEventCause";
import * as ba from "azure-devops-node-api/BuildApi";
import {CiCausesType} from "../../dto/events/CiTypes";
import {BuildReason} from "azure-devops-node-api/interfaces/BuildInterfaces";

export class CiEventCauseBuilder {
    public static async buildCiEventCauses(isRoot, connection: WebApi, projectName: string, pipelineFullName: string, buildId: number): Promise<CiEventCause[]> {
        let rootCause: CiEventCause = await CiEventCauseBuilder.buildCiEventRootCause(connection, projectName, buildId);
        if(isRoot) {
            return [rootCause];
        } else {
            let cause = new CiEventCause(CiCausesType.UPSTREAM, rootCause.userName, rootCause.userId, pipelineFullName, buildId, [rootCause]);
            return [cause];
        }
    }

    private static async buildCiEventRootCause(connection: WebApi, projectName: string, buildId: number): Promise<CiEventCause> {
        function convert_root_ci_causes_type(buildReason: number): CiCausesType {
            switch (buildReason) {
                case BuildReason.All:
                case BuildReason.ValidateShelveset:
                case BuildReason.CheckInShelveset:
                case BuildReason.None:
                case BuildReason.BuildCompletion:
                    return CiCausesType.UNDEFINED;
                case BuildReason.Manual:
                case BuildReason.IndividualCI:
                case BuildReason.PullRequest:
                case BuildReason.UserCreated:
                    return CiCausesType.USER;
                case BuildReason.Schedule:
                case BuildReason.ScheduleForced:
                case BuildReason.BatchedCI:
                    return CiCausesType.TIMER;
                case BuildReason.Triggered:
                    return CiCausesType.SCM;
                default:
                    return CiCausesType.UNDEFINED;
            }
        }

        let buildApi: ba.IBuildApi = await connection.getBuildApi();
        let build_info = await buildApi.getBuild(projectName, buildId);
        let reason: number = build_info.reason;
        let ciType: CiCausesType = convert_root_ci_causes_type(reason);
        let userName = build_info.requestedBy.displayName;
        let userId = build_info.requestedBy.uniqueName;
        let root_cause : CiEventCause = new CiEventCause(ciType, userName, userId, projectName, buildId);
        return root_cause;
    }
}