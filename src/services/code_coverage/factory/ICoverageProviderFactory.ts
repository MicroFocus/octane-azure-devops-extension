import { ICoverageProvider } from '../providers/ICoverageProvider';
import { CoverageReportType } from '../enums/CodeCoverageConstants';

export interface ICoverageProviderFactory {
    create(reportType: CoverageReportType): Promise<ICoverageProvider | null>;
}