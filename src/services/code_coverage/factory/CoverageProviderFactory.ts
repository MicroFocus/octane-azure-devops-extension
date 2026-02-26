/*
 * Copyright 2020-2026 Open Text
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
import {LogUtils} from "../../../LogUtils";
import {CoverageReportType, SONARQUBE_AUTH_SCHEME, SonarQubeInjectedVariables} from "../enums/CodeCoverageConstants";
import {ICoverageProvider} from "../providers/ICoverageProvider";
import {SonarQubeConfig} from "../dto/SonarQubeConfig";
import {SystemVariablesConstants} from "../../../ExtensionConstants";
import {ICoverageProviderFactory} from "./ICoverageProviderFactory";
import {ArtifactCoverageProvider} from "../providers/ArtifactCoverageProvider";
import {SonarCoverageProvider} from "../providers/SonarCoverageProvider";
import {EndpointAuthorization} from "azure-pipelines-task-lib";

export class CoverageProviderFactory implements ICoverageProviderFactory {

    constructor(
        private readonly api: WebApi,
        private readonly projectName: string,
        private readonly buildId: number,
        private readonly tl: any,
        private readonly logger: LogUtils
    ) {}

    /**
     * Creates and returns an appropriate coverage provider based on the report type.
     *
     * Instantiates the correct coverage provider implementation for the specified
     * coverage report type. For JaCoCo XML and LCOV reports, it creates an
     * ArtifactCoverageProvider. For SonarQube reports, it creates a SonarCoverageProvider
     * with configuration retrieved from Azure DevOps variables. Returns null if no
     * coverage provider is configured for the given report type.
     *
     * @param {CoverageReportType} reportType - The type of coverage report to handle
     * @returns {Promise<ICoverageProvider | null>} A promise that resolves to a coverage provider instance, or null if none is configured
     * @throws {Error} If SonarQube scanner parameters are not found when creating a SonarCoverageProvider
     */
    async create(reportType: CoverageReportType): Promise<ICoverageProvider | null> {

        switch (reportType) {

            case CoverageReportType.JACOCOXML:
            case CoverageReportType.LCOV:
                this.logger.debug('Creating ArtifactCoverageProvider');
                return new ArtifactCoverageProvider(
                    this.api,
                    this.projectName,
                    this.buildId,
                    reportType,
                    this.logger
                );

            case CoverageReportType.SONARQUBE:
                this.logger.debug('Creating SonarCoverageProvider');
                const sonarConfig = await this.buildSonarConfig();
                return new SonarCoverageProvider(sonarConfig, this.logger);

            default:
                this.logger.debug('No coverage provider configured.');
                return null;
        }
    }

    /**
     * Builds a SonarQube configuration from Azure DevOps environmental variables and service connection.
     *
     * Resolves the SonarQube service connection, validates the authorization scheme,
     * extracts the authentication token, and parses the injected scanner parameters
     * to construct a {@link SonarQubeConfig} object.
     *
     * @returns {Promise<SonarQubeConfig>} A promise that resolves to a SonarQube configuration object
     * @throws {Error} If the service connection input cannot be resolved
     * @throws {Error} If the service connection authorization is not found
     * @throws {Error} If the authorization scheme is not '{@link SONARQUBE_AUTH_SCHEME}'
     * @throws {Error} If the authentication token cannot be resolved
     * @throws {Error} If the SonarQube project key or host URL cannot be resolved
     * @private
     */
    private async buildSonarConfig(): Promise<SonarQubeConfig> {
        const sonarServiceConnection: string = this.tl.getInput(SystemVariablesConstants.SONARQUBE_SERVICE_CONNECTION, true);
        if (!sonarServiceConnection) {
            throw new Error('SonarQube service connection input could not be resolved.');
        }

        const sonarEndpointAuthorization: EndpointAuthorization = this.tl.getEndpointAuthorization(sonarServiceConnection, true);
        if (!sonarEndpointAuthorization) {
            throw new Error('SonarQube service connection authorization not found.');
        }

        const sonarToken: string = this.getTokenFromAuthorizationScheme(sonarEndpointAuthorization);
        const { projectKey, sonarHostUrl } = this.parseSonarScannerParams();

        this.logger.debug(`SonarQube config - hostUrl: ${sonarHostUrl}, projectKey: ${projectKey}, token length: ${sonarToken.length}`);

        return {
            sonarHostUrl: sonarHostUrl,
            sonarAuthToken: sonarToken,
            projectKey: projectKey
        };
    }

    /**
     * Extracts and validates the authentication token from a SonarQube endpoint authorization.
     *
     * Ensures the authorization scheme is {@link SONARQUBE_AUTH_SCHEME} and retrieves
     * the token from the `username` parameter of the endpoint authorization.
     *
     * @param {EndpointAuthorization} sonarEndpointAuthorization - The endpoint authorization object from the SonarQube service connection
     * @returns {string} The resolved SonarQube authentication token
     * @throws {Error} If the authorization scheme is not {@link SONARQUBE_AUTH_SCHEME}
     * @throws {Error} If the token cannot be resolved from the authorization parameters
     * @private
     */
    private getTokenFromAuthorizationScheme(sonarEndpointAuthorization: EndpointAuthorization): string {
        if (sonarEndpointAuthorization.scheme !== SONARQUBE_AUTH_SCHEME) {
            throw new Error(`Unsupported SonarQube auth scheme: '${sonarEndpointAuthorization.scheme}'. Expected '${SONARQUBE_AUTH_SCHEME}'.`);
        }

        const sonarToken: string = sonarEndpointAuthorization.parameters?.username;
        if (!sonarToken) {
            throw new Error('SonarQube token could not be resolved from service connection.');
        }

        return sonarToken;
    }

    /**
     * Parses the injected SonarQube scanner parameters from the pipeline environment.
     *
     * Reads and parses the {@link SystemVariablesConstants.SONARQUBE_SCANNER_PARAMS} pipeline variable,
     * then extracts and validates the project key and host URL.
     *
     * @returns {{ projectKey: string; sonarHostUrl: string }} An object containing the resolved SonarQube project key and host URL
     * @throws {Error} If the SonarQube project key cannot be resolved from the scanner parameters
     * @throws {Error} If the SonarQube host URL cannot be resolved from the scanner parameters
     * @private
     */
    private parseSonarScannerParams(): { projectKey: string; sonarHostUrl: string } {
        const rawSonarScannerParams = this.tl.getVariable(SystemVariablesConstants.SONARQUBE_SCANNER_PARAMS);
        if (!rawSonarScannerParams) {
            throw new Error('SonarQube scanner parameters pipeline variable could not be resolved.');
        }

        let parsedSonarScannerParams: Record<string, string>;
        try {
            parsedSonarScannerParams = JSON.parse(rawSonarScannerParams);
        } catch {
            throw new Error(`Failed to parse SonarQube scanner parameters: invalid JSON.`);
        }

        const projectKey: string = parsedSonarScannerParams[SonarQubeInjectedVariables.SONAR_PROJECT_KEY];
        const sonarHostUrl: string = parsedSonarScannerParams[SonarQubeInjectedVariables.SONAR_HOST_URL];

        if (!projectKey) throw new Error('SonarQube project key could not be resolved.');
        if (!sonarHostUrl) throw new Error('SonarQube host URL could not be resolved.');

        return { projectKey, sonarHostUrl };
    }
}