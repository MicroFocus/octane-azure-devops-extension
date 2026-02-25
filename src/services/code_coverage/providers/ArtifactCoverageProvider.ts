import {ICoverageProvider} from "./ICoverageProvider";
import {WebApi} from "azure-devops-node-api";
import {CoverageFilePattern, CoverageReportType, EncodingType} from "../enums/CodeCoverageConstants";
import {LogUtils} from "../../../LogUtils";
import * as AdmZip from "adm-zip";


export class ArtifactCoverageProvider implements ICoverageProvider {

    private readonly ARTIFACT_NAME = 'coverage-report';

    constructor(
        private readonly api: WebApi,
        private readonly projectName: string,
        private readonly buildId: number,
        private readonly reportType: CoverageReportType,
        private readonly logger: LogUtils
    ) {}

    async fetchCoverage(): Promise<string> {
        const buffer = await this.getCoverageFromBuildArtifact();
        return buffer.toString(EncodingType.UTF8);
    }

    /**
     * Downloads and extracts the coverage report file from a build artifact.
     *
     * This method fetches the artifact from Azure DevOps, downloads it as a ZIP file,
     * extracts its contents, and locates the coverage report file matching the configured
     * report type pattern.
     *
     * @returns {Promise<Buffer>} A buffer containing the coverage report file data
     * @throws {Error} If the artifact has no download URL
     * @throws {Error} If the artifact download fails (non-200 status code)
     * @throws {Error} If no coverage file matching the report type is found in the artifact
     * @private
     */
    private async getCoverageFromBuildArtifact(): Promise<Buffer> {
        const buildApi = await this.api.getBuildApi();
        const artifact = await buildApi.getArtifact(
            this.projectName,
            this.buildId,
            this.ARTIFACT_NAME
        );

        this.logger.debug(
            `Artifact metadata: ${JSON.stringify({
                name: artifact.name,
                type: artifact.resource?.type,
                data: artifact.resource?.data,
                downloadUrl: artifact.resource?.downloadUrl
            }, null, 2)}`
        );

        if (!artifact?.resource?.downloadUrl) {
            throw new Error('Artifact has no downloadUrl');
        }

        const httpClient = this.api.rest.client;
        const response = await httpClient.get(artifact.resource.downloadUrl);

        if (response.message.statusCode !== 200) {
            throw new Error(`Failed to download artifact ${this.ARTIFACT_NAME}: ${response.message.statusCode} ${response.message.statusMessage}`);
        }

        const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            response.message.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.message.on('end', () => resolve(Buffer.concat(chunks)));
            response.message.on('error', reject);
        });
        this.logger.debug(`Downloaded artifact ${this.ARTIFACT_NAME}, buffer size: ${zipBuffer.length} bytes`);

        const artifactZip = new AdmZip(zipBuffer);
        const zipEntries = artifactZip.getEntries();
        this.logger.debug(`Entry names: ${zipEntries.map(e => e.entryName).join(', ')}`);

        const coverageReportEntry = zipEntries.find(entry => this.matchesCoveragePattern(entry.entryName));

        if (!coverageReportEntry) {
            this.logger.error(`Coverage file not found for type ${this.reportType}. Available entries: ${zipEntries.map(e => e.entryName).join(', ')}`);
            throw new Error(`Coverage file not found in artifact ${this.ARTIFACT_NAME}`);
        }

        this.logger.info(`Found coverage report file at: ${coverageReportEntry.entryName}, size: ${coverageReportEntry.header.size} bytes`);

        return coverageReportEntry.getData();
    }

    /**
     * Determines if a file entry name matches the expected coverage report pattern.
     *
     * Checks if the given entry name matches the file pattern for the configured
     * coverage report type (JaCoCo XML or LCOV). For JaCoCo, it looks for files
     * containing "jacoco" and ending with ".xml". For LCOV, it looks for files
     * containing "lcov" and ending with ".info".
     *
     * @param {string} entryName - The name of the file entry to check
     * @returns {boolean} True if the entry name matches the coverage pattern, false otherwise
     * @private
     */
    private matchesCoveragePattern(entryName: string): boolean {
        const lowerEntryName = entryName.toLowerCase();

        if (this.reportType?.toLowerCase() === CoverageReportType.JACOCOXML) {
            return lowerEntryName.includes(CoverageFilePattern.JACOCO) && lowerEntryName.endsWith(CoverageFilePattern.JACOCO_EXTENSION);
        }

        if (this.reportType?.toLowerCase() === CoverageReportType.LCOV) {
            return lowerEntryName.includes(CoverageFilePattern.LCOV) && lowerEntryName.endsWith(CoverageFilePattern.LCOV_EXTENSION);
        }

        return false;
    }
}