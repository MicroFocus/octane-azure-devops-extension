export interface SonarComponentTreeResponse {
    baseComponent: SonarComponent;
    components?: SonarComponent[];
    paging: SonarPaging;
}

export interface SonarMeasure {
    metric: string;
    value: string;
}

export interface SonarComponent {
    key: string;
    name?: string;
    path?: string;
    measures?: SonarMeasure[];
}

export interface SonarPaging {
    pageIndex: number;
    pageSize: number;
    total: number;
}