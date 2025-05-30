export interface AzureDevopsPipelineParameter {
    name: string;
    type: 'string' | 'boolean';
    default?: string;
    displayName?: string;
    values?: string[];
}