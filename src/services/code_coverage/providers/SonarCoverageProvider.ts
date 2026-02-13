import {SonarQubeConfig} from "../dto/SonarQubeConfig";
import {LogUtils} from "../../../LogUtils";
import {ICoverageProvider} from "./ICoverageProvider";
import {SonarCoverageReport} from "../dto/SonarCoverageReport";
import {SonarCodeCoverageFetchParameters} from "../enums/CodeCoverageConstants";
import axios from "axios";

export class SonarCoverageProvider implements ICoverageProvider {

    constructor(
        private readonly config: SonarQubeConfig,
        private readonly logger: LogUtils
    ) {}

    async fetchCoverage(): Promise<string> {
        const sonarCoverageReport: SonarCoverageReport = await this.fetchSonarCoverage();
        return JSON.stringify(sonarCoverageReport);
    }

    /**
     * Fetches code coverage data from SonarQube by paginating through all project files.
     *
     * Iteratively requests coverage data from SonarQube's component tree API, handling
     * pagination to retrieve all files. For each page, merges the coverage metrics
     * (coverable lines and covered lines) into a consolidated coverage report.
     *
     * @returns {Promise<SonarCoverageReport>} A promise that resolves to a complete coverage report containing project-level metrics and per-file coverage data
     * @private
     */
    private async fetchSonarCoverage(): Promise<SonarCoverageReport> {
        let pageIndex = 0;
        const buildCoverageReport: SonarCoverageReport = {
            projectName: null,
            totalCoverableLines: 0,
            sumOfCoveredLines: 0,
            fileCoverageList: []
        };

        let hasMorePages = true;

        while (hasMorePages) {
            pageIndex++;
            this.logger.debug('Page Index = ' + pageIndex);
            const pageData = await this.getPageFromSonar(this.config.sonarHostUrl, this.config.projectKey, this.config.sonarAuthToken, pageIndex);

            this.mergeSonarCoverageReport(buildCoverageReport, pageData);
            hasMorePages = this.sonarReportHasAnotherPage(pageIndex, pageData);
            this.logger.debug('Has more pages: ' + hasMorePages);
        }

        this.logger.debug('Build coverage report final object: ' + JSON.stringify(buildCoverageReport, null, 2));

        return buildCoverageReport;
    }

    /**
     * Retrieves a single page of coverage data from the SonarQube API.
     *
     * Constructs a URL with pagination parameters, authenticates using Basic Auth
     * with the provided token, and fetches component tree data containing coverage
     * metrics.
     *
     * @param {string} sonarHostUrl - The base URL of the SonarQube server
     * @param {string} projectKey - The unique identifier of the project in SonarQube
     * @param {string} sonarToken - The authentication token for SonarQube API access
     * @param {number} pageIndex - The page number to fetch
     * @returns {Promise<any>} A promise that resolves to the JSON response containing component tree data with coverage metrics
     * @throws {Error} If authentication fails (401) or the API request fails
     * @private
     */
    private async getPageFromSonar(
        sonarHostUrl: string,
        projectKey: string,
        sonarToken: string,
        pageIndex: number
    ): Promise<any> {
        const urlString = await this.buildSonarFetchUrl(sonarHostUrl, projectKey, pageIndex);
        const authHeader = 'Basic ' + Buffer.from(`${sonarToken}:`).toString('base64');

        try {
            const response = await axios.get(urlString, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            });

            this.logger.debug(`Response status: ${response.status} ${response.statusText}`);
            this.logger.debug(`Result: ${JSON.stringify(response.data, null, 2)}`);

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    this.logger.error('Authentication failed with SonarQube');
                    throw new Error('Unauthorized: Sonar token is invalid or lacks access');
                }
                this.logger.error(`SonarQube API request failed with status ${error.response?.status}`);
                throw new Error(`Sonar API error: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw new Error(`Failed to fetch from Sonar: ${error}`);
        }
    }

    /**
     * Constructs the SonarQube API URL for fetching component tree coverage data.
     *
     * Builds a URL targeting the SonarQube measures/component_tree endpoint with
     * query parameters for coverage metrics (lines to cover, uncovered lines),
     * qualifiers, page size, and page index.
     *
     * @param {string} sonarHostUrl - The base URL of the SonarQube server
     * @param {string} projectKey - The unique identifier of the project in SonarQube
     * @param {number} pageIndex - The page number to fetch (1-based index)
     * @returns {Promise<string>} A promise that resolves to the fully constructed API URL with query parameters
     * @private
     */
    private async buildSonarFetchUrl(
        sonarHostUrl: string,
        projectKey: string,
        pageIndex: number
    ): Promise<string> {
        this.logger.info(`Building Component Tree URL...`);
        this.logger.debug(`SonarQube Host: ${sonarHostUrl}`);
        this.logger.debug(`Project Key: ${projectKey}`);

        const params = new URLSearchParams({
            component: projectKey,
            metricKeys: `${SonarCodeCoverageFetchParameters.LINES_TO_COVER},${SonarCodeCoverageFetchParameters.UNCOVERED_LINES}`,
            qualifiers: `${SonarCodeCoverageFetchParameters.FIL},${SonarCodeCoverageFetchParameters.TRK}`,
            ps: SonarCodeCoverageFetchParameters.PAGE_SIZE,
            p: pageIndex.toString()
        });

        const url = `${sonarHostUrl}/api/measures/component_tree?${params.toString()}`;
        this.logger.debug(`Final URL constructed: ${url}`);

        return url;
    }

    /**
     * Merges a page of SonarQube coverage data into the consolidated coverage report.
     *
     * On the first page, extracts and stores the project name and calculates total
     * project-level coverage metrics from the base component. For all pages, iterates
     * through file components and adds their individual coverage data to the report's
     * file list.
     *
     * @param {SonarCoverageReport} buildCoverageReport - The accumulated coverage report to merge data into
     * @param {any} jsonReport - The JSON response from SonarQube API containing component tree and coverage metrics
     * @returns {void}
     * @private
     */
    private mergeSonarCoverageReport(buildCoverageReport: SonarCoverageReport, jsonReport: any): void {
        if (!buildCoverageReport.projectName) {
            const baseComponent = jsonReport.baseComponent;
            buildCoverageReport.projectName = baseComponent.name;

            const projectCoverage = this.getFileCoverageFromJson(baseComponent);
            buildCoverageReport.totalCoverableLines = projectCoverage.totalCoverableLines;
            buildCoverageReport.sumOfCoveredLines = projectCoverage.sumOfCoveredLines;
        }

        const components = jsonReport.components || [];
        for (const component of components) {
            const fileCoverage = this.getFileCoverageFromJson(component);
            buildCoverageReport.fileCoverageList.push(fileCoverage);
        }
    }

    /**
     * Extracts a numeric value for a specific metric from a SonarQube measures array.
     *
     * Searches through the measures array for an entry matching the provided metric key,
     * parses its value as an integer, and returns it. Returns 0 if the metric is not found.
     *
     * @param {string} metricKey - The metric identifier to search for (e.g., 'lines_to_cover', 'uncovered_lines')
     * @param {any[]} measures - Array of measure objects from SonarQube API response
     * @returns {number} The parsed integer value of the metric, or 0 if not found
     * @private
     */
    private getValueFromMeasuresArray(metricKey: string, measures: any[]): number {
        const measure = measures.find(m => m.metric === metricKey);
        return measure ? parseInt(measure.value, 10) : 0;
    }

    /**
     * Extracts and normalizes file-level coverage information from a SonarQube
     * component JSON object.
     *
     * The method reads the coverage-related measures (e.g. lines to cover and
     * uncovered lines) and converts them into the internal coverage format
     * expected by Octane.
     *
     * @param component - A SonarQube component object containing coverage measures.
     * @returns An object containing:
     *  - path: The file path (or component key if path is not available)
     *  - totalCoverableLines: Total number of lines that can be covered
     *  - sumOfCoveredLines: Number of lines effectively covered
     */
    private getFileCoverageFromJson(component: any) {
        const measures = component.measures || [];
        const linesToCover = this.getValueFromMeasuresArray(SonarCodeCoverageFetchParameters.LINES_TO_COVER, measures);
        const uncoveredLines = this.getValueFromMeasuresArray(SonarCodeCoverageFetchParameters.UNCOVERED_LINES, measures);

        return {
            path: component.path || component.key,
            totalCoverableLines: linesToCover,
            sumOfCoveredLines: linesToCover - uncoveredLines
        };
    }

    /**
     * Determines if there are additional pages of coverage data to fetch from SonarQube.
     *
     * Examines the paging metadata from the SonarQube API response to calculate whether
     * more pages remain. Compares the product of page size and current page index against
     * the total number of items to determine if pagination should continue.
     *
     * @param {number} pageIndex - The current page number (1-based index)
     * @param {any} jsonContent - The JSON response from SonarQube API containing paging metadata
     * @returns {boolean} True if there are more pages to fetch, false otherwise
     * @private
     */
    private sonarReportHasAnotherPage(pageIndex: number, jsonContent: any): boolean {
        const pagingNode = jsonContent.paging;
        const pageSize = pagingNode.pageSize;
        const total = pagingNode.total;
        return pageSize * pageIndex < total;
    }
}