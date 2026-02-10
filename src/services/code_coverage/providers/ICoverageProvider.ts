export interface ICoverageProvider {
    fetchCoverage(): Promise<string>;
}