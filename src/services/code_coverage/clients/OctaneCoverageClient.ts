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