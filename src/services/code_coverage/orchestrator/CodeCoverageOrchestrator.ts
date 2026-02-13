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