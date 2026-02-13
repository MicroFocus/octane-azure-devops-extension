export interface SonarCoverageReport {
    projectName: string;
    totalCoverableLines: number;
    sumOfCoveredLines: number;
    fileCoverageList: Array<{
        path: string;
        totalCoverableLines: number;
        sumOfCoveredLines: number;
    }>;
}