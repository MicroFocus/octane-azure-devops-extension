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

import {LogUtils} from "../../../LogUtils";
import {CoverageUrlParam, EncodingType} from "../enums/CodeCoverageConstants";
import {Octane} from "@microfocus/alm-octane-js-rest-sdk";

export class OctaneCoverageClient {

    constructor(
        private readonly octaneConnection: any,
        private readonly instanceId: string,
        private readonly analyticsUrl: string,
        private readonly logger: LogUtils
    ) {}

    /**
     * Sends code coverage data to OpenText ALM Octane Analytics.
     *
     * Encodes the job CI ID, constructs a URL with required parameters (CI server identity,
     * job ID, build ID, file type, and encoding), and sends the coverage data to Octane's
     * analytics endpoint via a custom HTTP request.
     *
     * @param {string} coverage - The coverage report data to send
     * @param {string} buildId - The CI build identifier
     * @param {string} jobCiId - The CI job identifier (will be base64-encoded)
     * @param {string} reportType - The type of coverage report (e.g., "jacocoxml", "lcov")
     * @returns {Promise<void>} A promise that resolves when the coverage data is successfully sent
     * @throws {Error} If the HTTP request to Octane fails
     */
    async sendCoverage(coverage: string, buildId: string, jobCiId: string, reportType: string): Promise<void> {
        this.logger.debug(`Sending code coverage for build ${buildId}`);

        const encodedJobCiId = Buffer.from(jobCiId, EncodingType.UTF8).toString(EncodingType.BASE64);

        const params = new URLSearchParams({
            [CoverageUrlParam.CI_SERVER_IDENTITY]: this.instanceId,
            [CoverageUrlParam.CI_JOB_ID]: encodedJobCiId,
            [CoverageUrlParam.CI_BUILD_ID]: buildId,
            [CoverageUrlParam.FILE_TYPE]: reportType,
            [CoverageUrlParam.CI_JOB_ENCODING]: EncodingType.BASE64
        });

        const url = `${this.analyticsUrl}${CoverageUrlParam.COVERAGE_PATH}?${params}`;

        this.logger.debug(`Sending coverage to URL: ${url}`);

        await this.octaneConnection.executeCustomRequest(
            url,
            Octane.operationTypes.update,
            coverage,
            {
                'Content-Type': 'text/plain'
            }
        );

        this.logger.info(`Code coverage sent successfully for build ${buildId}`);
    }
}