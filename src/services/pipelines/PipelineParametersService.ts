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

    public async getParameters(connection: WebApi, definitionId: number, buildId: string, projectName: string, branchName: string): Promise<CiParameter[]> {
        try {
            const buildApi: ba.IBuildApi = await connection.getBuildApi();
            const buildDef = await buildApi.getDefinition(projectName, definitionId);
            let parameters: CiParameter[] = [this.createParameter('branch', '', true, branchName)];
            this.logger.info('Get parameters from task.');
            this.logger.debug('Get Parameters - Build definition variables: ' + buildDef?.variables?.toString());
            if (buildDef.variables) {
                Object.keys(buildDef.variables)
                        .map(paramKey =>this.createParameter(paramKey, '', true,this.tl.getVariable(paramKey) ? this.tl.getVariable(paramKey) : ''))
                        .forEach(parameter => parameters.push(parameter));
            }

            this.logger.info('Get parameters from build.');
            const build = await buildApi.getBuild(projectName, Number(buildId));
            this.logger.debug('Build parameters received: ' + build.parameters);
            if (build.parameters) {
                const buildParams = JSON.parse(build.parameters);
                Object.keys(buildParams).forEach(paramKey => {
                    const variable = buildParams[paramKey];
                    if (!parameters.some(parameter => parameter.name === paramKey)) {
                        parameters.push(this.createParameter(paramKey, '', true,variable))
                    }
                });
            }
            if(parameters?.length > 0) {
                this.logger.info('Build parameters: ' + parameters.map(param => param.name + '=' + param.defaultValue + '-'+ param.value).join(';'));
            }
            return parameters;
        } catch (e) {
            this.logger.error('Failed to parse parameters. error: ' + e);
        }
        return [];
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
