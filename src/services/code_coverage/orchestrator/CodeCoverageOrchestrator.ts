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

import {ICoverageProvider} from "../providers/ICoverageProvider";
import {OctaneCoverageClient} from "../clients/OctaneCoverageClient";
import {LogUtils} from "../../../LogUtils";

export class CodeCoverageOrchestrator {

    constructor(
        private readonly provider: ICoverageProvider,
        private readonly octaneClient: OctaneCoverageClient,
        private readonly logger: LogUtils
    ) {}

    /**
     * Orchestrates the code coverage workflow by fetching and sending coverage data.
     * Retrieves coverage data from the configured provider and sends it to
     * Octane using the Octane client.
     *
     * @param {string} buildId - The CI build identifier
     * @param {string} jobCiId - The CI job identifier
     * @param {string} reportType - The type of coverage report (e.g., "jacocoxml", "lcov")
     * @returns {Promise<void>} A promise that resolves when the coverage workflow completes
     * @throws {Error} If coverage fetching or sending fails
     */
    async execute(
        buildId: string,
        jobCiId: string,
        reportType: string
    ): Promise<void> {
        try {
            this.logger.debug('Starting code coverage orchestration...');
            const coverage: string = await this.provider.fetchCoverage();
            await this.octaneClient.sendCoverage(coverage, buildId, jobCiId, reportType);
        } catch (error: any) {
            this.logger.error(`Code coverage orchestration failed : ${error.message}`);
        }

    }
}