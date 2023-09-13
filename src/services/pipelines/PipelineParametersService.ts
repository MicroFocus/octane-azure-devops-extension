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

    public async getParametersWithBranch(connection: WebApi, definitionId: number, buildId: string, projectName: string, branchName: string, withBranch:boolean): Promise<CiParameter[]> {

        let parameters: CiParameter[] = await this.getParameters(connection, definitionId, buildId, projectName, branchName);
        if(withBranch) {
            parameters.push(this.createParameter('branch', '', true, branchName));
        }
        return parameters
    }

    public async getParameters(connection: WebApi, definitionId: number, buildId: string, projectName: string, branchName: string): Promise<CiParameter[]> {
        try {
            const buildApi: ba.IBuildApi = await connection.getBuildApi();
            const buildDef = await buildApi.getDefinition(projectName, definitionId);
            let parameters: CiParameter[] = [];
            this.logger.info('Get parameters from task.');
            this.logger.debug('Get Parameters - Build definition variables: ' + buildDef?.variables?.toString());
            if (buildDef.variables) {
                Object.keys(buildDef.variables)
                        .map(paramKey => this.createParameter(paramKey,
                            (buildDef.variables[paramKey] && buildDef.variables[paramKey].value) ?
                                buildDef.variables[paramKey].value : '',true,
                            this.tl.getVariable(paramKey) ? this.tl.getVariable(paramKey) : ''))
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


    public async getDefinedParametersWithBranch(connection: WebApi, definitionId: number, projectName: string, branchName: string, withBranch: boolean): Promise<CiParameter[]> {

        let parameters: CiParameter[] = await this.getDefinedParameters(connection, definitionId, projectName, branchName);
        if(withBranch) {
            parameters.push(this.createParameter('branch', branchName, undefined, 'Branch to execute pipeline'));
        }
        return parameters
    }
    public async getDefinedParameters(connection: WebApi, definitionId: number, projectName: string, branchName: string): Promise<CiParameter[]> {
        const buildApi: ba.IBuildApi = await connection.getBuildApi();
        let parameters: CiParameter[] = [];

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
