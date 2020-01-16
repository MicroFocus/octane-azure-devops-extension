import {WebApi} from "azure-devops-node-api";
import {CiEventCause} from "./CiEventCause";
import * as ba from "azure-devops-node-api/BuildApi";
import {CiCausesType} from "./CiTypes";
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
        let root_cause : CiEventCause = new CiEventCause(ciType, userName, userId);
        return root_cause;
    }
}