import {CiParameter} from "../../dto/events/CiParameter";
import {WebApi} from "azure-devops-node-api";
import * as ba from "azure-devops-node-api/BuildApi";
import {LogUtils} from "../../LogUtils";

export class PipelineParametersService {
    private logger: LogUtils;
    private tl: any;

    constructor(tl: any, logger: LogUtils) {
        this.tl = tl;
        this.logger = logger;
    }

    public async getDefinedParameters(connection: WebApi, definitionId: number, projectName: string, branchName: string): Promise<CiParameter[]> {
        const buildApi: ba.IBuildApi = await connection.getBuildApi();
        let parameters: CiParameter[] = [this.createParameter('branch', branchName, undefined, 'Branch to execute pipeline')];
        const buildDef = await buildApi.getDefinition(projectName, definitionId);
        this.logger.debug('Get Defined Parameters - Build definition variables: ' + buildDef.variables);
        if (buildDef.variables) {
            Object.keys(buildDef.variables)
            .map(paramKey => {
                const variable = buildDef.variables[paramKey]
                parameters.push(this.createParameter(paramKey, variable.value,false));
            })
        }

        return parameters;
    }

    private createParameter(name: string, defaultValue: string,addValue:boolean, value?: string, description?: string): CiParameter {
        this.logger.debug('Create variable name:' + name + ', defaultValue:' +defaultValue + ', value: ' + value + '\'');
        return {
            name: name,
            defaultValue: defaultValue,
            type: 'string',
            choices: [],
            description: description ? description : '',
            ...(addValue) && {value: value ? value : ''}
        }
    }

}
