/*
 * Copyright 2020-2025 Open Text
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
export const enum CI_SERVER_INFO {
    CI_SERVER_TYPE = 'azure_devops',
    PLUGIN_VERSION = '1.0.0',
}

export enum InputConstants {
    OCTANE_SERVICE_CONNECTION = 'OctaneServiceConnection',
    GITHUB_REPOSITORY_CONNECTION = 'GithubRepositoryConnection',
    WORKSPACES_LIST = 'WorkspaceList',
    CUCUMBER_REPORT_PATH = 'CucumberReportPath',
    AZURE_PAT = 'PAT',
    FRAMEWORK = 'Framework',
    TESTS_TO_RUN = 'testsToRun',
    EXECUTION_ID = 'executionId',
    SUITE_RUN_ID = 'suiteRunId',
    CREATE_PIPELINE = 'CreatePipelineCheckbox',
    REPO_URL = "GitRepositoryURL",

    PIPELINE_NAME = 'PipelineNameCreated',
    IS_FULL_PATHNAME = 'UseFullPipelinePath'
}

export enum SystemVariablesConstants {
    SYSTEM_TEAM_FOUNDATION_COLLECTION_URI = 'System.TeamFoundationCollectionUri',
    SYSTEM_TEAM_PROJECT_ID = 'System.TeamProjectId',
    SYSTEM_TEAM_PROJECT = 'System.TeamProject',
    SYSTEM_TEST_RUNNER_NAME = 'System.TestRunnerName',
    SYSTEM_TEST_RUNNER_SUBTYPE = 'System.TestRunnerSubtype',
    SYSTEM_TEST_RUNNER_FRAMEWORK_TYPE = 'System.TestRunnerFrameworkType',
    SYSTEM_TEST_RUNNER_FRAMEWORK_ID = 'System.TestRunnerFrameworkId',
    SYSTEM_CI_SERVER_ID = 'System.CiServerId',
    SYSTEM_CI_JOB_ID = 'System.CiJobId',
    ALM_OCTANE_LOG_LEVEL = 'ALMOctaneLogLevel',
    BUILD_SOURCE_BRANCH_NAME = 'Build.SourceBranchName',
    BUILD_DEFINITION_NAME = 'Build.DefinitionName',
    BUILD_BUILD_ID = 'Build.BuildId',
    AGENT_JOB_NAME = 'Agent.JobName',
    AGENT_JOB_STATUS = 'AGENT_JOBSTATUS',
    BUILD_DEFINITION_ID = 'System.DefinitionId',
    BUILD_SOURCE_BRANCH = "Build.SourceBranch"
}

export enum EndpointDataConstants {
    ENDPOINT_DATA_OCTANE_INSTANCE_ID = 'ENDPOINT_DATA_Octane_INSTANCE_ID',
    ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN = 'ENDPOINT_DATA_Octane_AZURE_PERSONAL_ACCESS_TOKEN',
    ENDPOINT_URL = 'ENDPOINT_URL'
}

export enum EntityTypeConstants {
    CI_SERVER_ENTITY_TYPE = 'ci_server',
    TEST_RUNNER_ENTITY_TYPE = 'test_runner',
    EXECUTOR_ENTITY_TYPE = 'executor',
    PIPELINE_ENTITY_TYPE = 'pipeline',
    CI_JOB_ENTITY_TYPE = 'ci_job'
}

export enum EntityTypeRestEndpointConstants {
    CI_SERVERS_REST_API_NAME = EntityTypeConstants.CI_SERVER_ENTITY_TYPE + 's',
    EXECUTORS_REST_API_NAME = EntityTypeConstants.EXECUTOR_ENTITY_TYPE + 's',
    PIPELINES_REST_API_NAME = EntityTypeConstants.PIPELINE_ENTITY_TYPE + 's',
    CI_JOB_REST_API_NAME = EntityTypeConstants.CI_JOB_ENTITY_TYPE + 's'
}

export enum OctaneTaskConstants {
    NGA_API = '/nga/api/v1/'
}

export enum AzureDevOpsApiVersions {
    API_VERSION_6_0_PREVIEW = 'api-version=6.0-preview',
    API_VERSION_7_1_PREVIEW = 'api-version=7.1'
}

export enum OctaneVariablesName {
    EXPERIMENTS ='ALMOctaneExperiments',
    OCTANE_VERSION = 'ALMOctaneVersion'
}
