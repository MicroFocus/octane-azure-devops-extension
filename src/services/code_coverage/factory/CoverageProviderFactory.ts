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
import {CoverageReportType, SonarQubeInjectedVariables} from "../enums/CodeCoverageConstants";
import {ICoverageProvider} from "../providers/ICoverageProvider";
import {SonarQubeConfig} from "../dto/SonarQubeConfig";
import {SystemVariablesConstants} from "../../../ExtensionConstants";
import {ICoverageProviderFactory} from "./ICoverageProviderFactory";
import {ArtifactCoverageProvider} from "../providers/ArtifactCoverageProvider";
import {SonarCoverageProvider} from "../providers/SonarCoverageProvider";

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
     * Builds a SonarQube configuration from Azure DevOps pipeline variables.
     *
     * Retrieves the SonarQube scanner parameters injected by the SonarQube extension
     * into the pipeline variables, parses the JSON, and extracts the host URL,
     * authentication token, and project key to construct a SonarQubeConfig object.
     *
     * @returns {Promise<SonarQubeConfig>} A promise that resolves to a SonarQube configuration object
     * @throws {Error} If the SonarQube scanner parameters variable is not found
     * @private
     */
    private async buildSonarConfig(): Promise<SonarQubeConfig> {
        const scannerParamsJson = this.tl.getVariable(SystemVariablesConstants.SONARQUBE_SCANNER_PARAMS);

        if (!scannerParamsJson) {
            throw new Error('SonarQube scanner params not found.');
        }

        const scannerParams = JSON.parse(scannerParamsJson);

        return {
            sonarHostUrl: scannerParams[SonarQubeInjectedVariables.SONAR_HOST_URL],
            sonarAuthToken: scannerParams[SonarQubeInjectedVariables.SONAR_LOGIN],
            projectKey: scannerParams[SonarQubeInjectedVariables.SONAR_PROJECT_KEY]
        };
    }
}