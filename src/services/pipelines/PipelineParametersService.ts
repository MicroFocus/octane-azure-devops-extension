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
import {CiParameter} from "../../dto/events/CiParameter";
import {WebApi} from "azure-devops-node-api";
import * as ba from "azure-devops-node-api/BuildApi";
import {LogUtils} from "../../LogUtils";
import * as yaml from 'js-yaml';
import {YamlProcess} from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as https from "https";
import {AzureDevopsPipelineConfiguration} from "../../dto/parameters/AzureDevopsPipelineConfiguration";
import {AzureDevOpsApiVersions, SystemVariablesConstants} from "../../ExtensionConstants";
import {AzureDevopsPipelineParameter} from "../../dto/parameters/AzureDevopsPipelineParameter";

export class PipelineParametersService {
    private logger: LogUtils;
    private tl: any;

    constructor(tl: any, logger: LogUtils) {
        this.tl = tl;
        this.logger = logger;
    }

    public async getParametersWithBranch(connection: WebApi, definitionId: number, buildId: string, projectName: string, branchName: string, withBranch:boolean, octaneUseAzureDevopsParametersValue: boolean): Promise<CiParameter[]> {

        let parameters: CiParameter[] = await this.getParameters(connection, definitionId, buildId, projectName, octaneUseAzureDevopsParametersValue);
        if(withBranch) {
            parameters.push(this.createParameter('branch', '', true, branchName));
        }
        return parameters
    }

    public async getParameters(connection: WebApi, definitionId: number, buildId: string, projectName: string, octaneUseAzureDevopsParametersValue: boolean): Promise<CiParameter[]> {
        try {
            const buildApi: ba.IBuildApi = await connection.getBuildApi();
            const buildDef = await buildApi.getDefinition(projectName, definitionId);
            let parameters: CiParameter[] = [];
            if(octaneUseAzureDevopsParametersValue) {
                const build = await buildApi.getBuild(projectName, Number(buildId));
                this.logger.info('Get runtime parameters from templateParameters.');
                const templateParameters: { [name: string]: any } = build.templateParameters || {};
                this.logger.debug('templateParameters payload:' + JSON.stringify(templateParameters));
                Object.entries(templateParameters).forEach(([paramKey, paramVal]) => {
                    parameters.push(
                        this.createParameter(paramKey, '', true, paramVal)
                    );
                });
            }
            else {
                this.logger.info('Getting variables.');
                this.logger.debug('Get Variables - Build definition variables: ' + JSON.stringify(buildDef?.variables));
                if (buildDef.variables) {
                    Object.keys(buildDef.variables)
                        .filter(paramKey => !buildDef.variables![paramKey].isSecret)
                            .map(paramKey => this.createParameter(paramKey,
                                (buildDef.variables[paramKey] && buildDef.variables[paramKey].value) ?
                                    buildDef.variables[paramKey].value : '',true,
                                this.tl.getVariable(paramKey) ? this.tl.getVariable(paramKey) : ''))
                            .forEach(parameter => parameters.push(parameter));
                }
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

    private async fetchPipelineConfigurationFileFromSourceProvider(projectName: string,
                                                                   encodedRepositoryName: string,
                                                                   repositoryType: string,
                                                                   branchName: string,
                                                                   filePath: string,
                                                                   serviceEndpointId: string,
                                                                   token: string): Promise<AzureDevopsPipelineParameter[]> {
        let url = '';
        if (repositoryType === 'TfsGit') {
            url = `${this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI)}/${projectName}/_apis/sourceProviders/${repositoryType}/filecontents?repository=${encodedRepositoryName}&commitOrBranch=${branchName}&path=${filePath}&${AzureDevOpsApiVersions.API_VERSION_7_1_PREVIEW}`
        } else {
            url = `${this.tl.getVariable(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI)}/${projectName}/_apis/sourceProviders/${repositoryType}/filecontents?repository=${encodedRepositoryName}&commitOrBranch=${branchName}&path=${filePath}&serviceEndpointId=${serviceEndpointId}&${AzureDevOpsApiVersions.API_VERSION_7_1_PREVIEW}`
        }
        this.logger.debug('The called url is: ' + url);
        const headers = {
            'Authorization': 'Basic ' + Buffer.from(token + ':').toString('base64'),
        };

        return new Promise((resolve, reject) => {
            https.get(url, {headers}, (res) => {
                let body: Buffer[] = [];

                this.logger.debug('Status code: ' + res.statusCode);
                res.on('data', chunk => body.push(chunk));
                res.on('end', () => {
                    const content = Buffer.concat(body).toString('utf8');
                    try {
                        const parsedContent = yaml.load(content) as AzureDevopsPipelineConfiguration;
                        resolve(parsedContent.parameters ?? []);
                    } catch {
                        resolve([]);
                    }
                });
            }).on('error', reject);
        });
    }

    public async getDefinedParametersWithBranch(connection: WebApi, buildId: string, definitionId: number, projectName: string, branchName: string, withBranch: boolean, token: string, octaneUseAzureDevopsParametersValue: boolean): Promise<CiParameter[]> {

        let parameters: CiParameter[] = await this.getDefinedParameters(connection, buildId, definitionId, projectName, token, octaneUseAzureDevopsParametersValue);
        if(withBranch) {
            parameters.push(this.createParameter('branch', branchName, undefined, 'Branch to execute pipeline'));
        }
        return parameters
    }

    public async getDefinedParameters(connection: WebApi, buildId: string, definitionId: number, projectName: string, token: string, octaneUseAzureDevopsParametersValue: boolean): Promise<CiParameter[]> {
        const buildApi: ba.IBuildApi = await connection.getBuildApi();
        const build = await buildApi.getBuild(projectName, Number(buildId));
        const buildDef = await buildApi.getDefinition(projectName, definitionId);
        let parameters: CiParameter[] = [];

        if(octaneUseAzureDevopsParametersValue){
            this.logger.debug('Fetching pipeline parameters using raw call');
            const repositoryType = buildDef.repository.type;
            const encodedRepositoryName = encodeURIComponent(buildDef.repository.name)
            const filePath = (buildDef.process as YamlProcess).yamlFilename;
            const branch = build.sourceBranch;
            const serviceEndpointId = buildDef.repository.properties.connectedServiceId;

            const yamlParameters =
                await this.fetchPipelineConfigurationFileFromSourceProvider(projectName,
                                                                            encodedRepositoryName,
                                                                            repositoryType,
                                                                            branch,
                                                                            filePath,
                                                                            serviceEndpointId,
                                                                            token);
            this.logger.info('The extracted pipeline parameters are: ' + JSON.stringify(yamlParameters));

            parameters.push(...yamlParameters.map(parameter =>
                this.createParameter(parameter.name, parameter.default ?? '', false)));
        }
        else {
            this.logger.info('Fetching variables');
            this.logger.debug('Get Variables - Build definition variables: ' + buildDef.variables);
            if (buildDef.variables) {
                Object.keys(buildDef.variables)
                    .filter(paramKey => !buildDef.variables![paramKey].isSecret)
                    .map(paramKey => {
                        const variable = buildDef.variables[paramKey]
                        parameters.push(this.createParameter(paramKey, variable.value, false));
                    })
            }
            this.logger.info('The extracted pipeline variables are: ' + JSON.stringify(parameters));
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
