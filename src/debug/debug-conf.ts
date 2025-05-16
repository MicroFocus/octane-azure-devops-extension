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
import {AuthScheme} from "../services/security/AuthScheme";
import {Auth} from "../services/security/Auth";
import {AccessToken} from "../services/security/AccessToken";
import {UsernamePassword} from "../services/security/UsernamePassword";
import {EndpointDataConstants, InputConstants, SystemVariablesConstants} from '../ExtensionConstants';
import {EndpointAuthorization} from 'azure-pipelines-task-lib';

interface System {
    teamFoundationCollectionUri: string;
    teamProjectId: string;
    teamProject: string;
    definitionId: number;

    testRunnerName: string;
    testRunnerSubtype: string;
    testRunnerFrameworkType: string;
    testRunnerFrameworkId: string;
    ciServerId: number;
    ciJobId: number;
    testsToRun: string;
    executionId: number;
    suiteRunId: number;
}

interface Logging {
    logLevel: string;
}

interface Build {
    sourceBranchName: string;
    definitionName: string;
    buildId: string;
    sourceBranch: string;
}

interface Octane {
    serviceConnectionName: string;
    workspaces: string;
    auth: Auth;
    framework: string;
    createPipelineCheckbox: string;
}

interface Endpoint {
    url: string;
    octaneInstanceId: string;
    azurePersonalAccessToken: string;
}

interface Repository {
    repositoryConnection: string;
    type: string;
    auth: Auth;
}

interface Proxy {
    http: string;
    https: string;
}

interface TestInjection {
    unit: Unit;
    gherkin: Gherkin;
}

interface Unit {
    junit: JUnit;
}

interface JUnit {
    jUnitProp: string;
}

interface Gherkin {
    cucumber: Cucumber;
}

interface Cucumber {
    cucumberReportPath: string;
}

interface Node {
    proxy: Proxy;
}

export interface TomlDebugConf {
    title: string;
    system: System;
    logging: Logging;
    build: Build;
    octane: Octane;
    endpoint: Endpoint;
    repository: Repository;
    node: Node;
    testInjection: TestInjection;
}

export class DebugConf {
    public input: Map<string, any>;
    public systemVariables: Map<string, any>;
    public octaneAuthentication: EndpointAuthorization;
    public gitHubAuthentication: EndpointAuthorization;

    constructor() {
        this.input = new Map<string, any>();
        this.systemVariables = new Map<string, any>();
    }
}

export class DebugConfToDebugMapsConverter {
    public static convert(conf: TomlDebugConf): DebugConf {
        let convertedDebugConf = new DebugConf();

        DebugConfToDebugMapsConverter.populateInputMap(conf, convertedDebugConf.input);
        DebugConfToDebugMapsConverter.populateSystemVariablesMap(conf, convertedDebugConf.systemVariables);
        convertedDebugConf.octaneAuthentication = DebugConfToDebugMapsConverter.getAuthentication(conf.octane.auth);
        convertedDebugConf.gitHubAuthentication = DebugConfToDebugMapsConverter.getAuthentication(conf.repository.auth);

        return convertedDebugConf;
    }

    private static populateInputMap(conf: TomlDebugConf, map: Map<string, any>) {
        map.set(InputConstants.OCTANE_SERVICE_CONNECTION, conf.octane.serviceConnectionName);
        map.set(InputConstants.WORKSPACES_LIST, conf.octane.workspaces);
        map.set(InputConstants.GITHUB_REPOSITORY_CONNECTION, conf.repository.repositoryConnection);
        map.set(InputConstants.CUCUMBER_REPORT_PATH, conf.testInjection.gherkin.cucumber.cucumberReportPath);
        map.set(InputConstants.FRAMEWORK, conf.octane.framework);
        map.set(InputConstants.CREATE_PIPELINE, conf.octane.createPipelineCheckbox);
    }

    private static populateSystemVariablesMap(conf: TomlDebugConf, map: Map<string, any>) {
        map.set(SystemVariablesConstants.ALM_OCTANE_LOG_LEVEL, conf.logging.logLevel.toString());
        map.set(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI, conf.system.teamFoundationCollectionUri);
        map.set(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID, conf.system.teamProjectId);
        map.set(SystemVariablesConstants.BUILD_SOURCE_BRANCH_NAME, conf.build.sourceBranchName);
        map.set(SystemVariablesConstants.BUILD_DEFINITION_ID,conf.system.definitionId);
        map.set(SystemVariablesConstants.BUILD_SOURCE_BRANCH,conf.build.sourceBranch);

        map.set(SystemVariablesConstants.SYSTEM_TEST_RUNNER_NAME, conf.system.testRunnerName);
        map.set(SystemVariablesConstants.SYSTEM_TEST_RUNNER_SUBTYPE, conf.system.testRunnerSubtype);
        map.set(SystemVariablesConstants.SYSTEM_TEST_RUNNER_FRAMEWORK_TYPE, conf.system.testRunnerFrameworkType);
        map.set(SystemVariablesConstants.SYSTEM_TEST_RUNNER_FRAMEWORK_ID, conf.system.testRunnerFrameworkId);
        map.set(SystemVariablesConstants.SYSTEM_CI_SERVER_ID, conf.system.ciServerId);
        map.set(SystemVariablesConstants.SYSTEM_CI_JOB_ID, conf.system.ciJobId);

        map.set(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN, conf.endpoint.azurePersonalAccessToken);
        map.set(EndpointDataConstants.ENDPOINT_DATA_OCTANE_INSTANCE_ID, conf.endpoint.octaneInstanceId);
        map.set(EndpointDataConstants.ENDPOINT_URL, conf.endpoint.url);

        map.set(SystemVariablesConstants.SYSTEM_TEAM_PROJECT, conf.system.teamProject);
        map.set(SystemVariablesConstants.BUILD_BUILD_ID, conf.build.buildId);
        map.set(SystemVariablesConstants.BUILD_DEFINITION_NAME, conf.build.definitionName);

        map.set(InputConstants.TESTS_TO_RUN, conf.system.testsToRun);
        map.set(InputConstants.EXECUTION_ID, conf.system.executionId);
        map.set(InputConstants.SUITE_RUN_ID, conf.system.suiteRunId);
    }

    private static getAuthentication(confAuth: Auth): EndpointAuthorization {
        if(confAuth.scheme == AuthScheme.USERNAME_PASSWORD) {
            let up: UsernamePassword = (confAuth.parameters as UsernamePassword);
            return {
                parameters: { 'username': up.username, 'password': up.password },
                scheme: confAuth.scheme.toString()
            }
        } else if(confAuth.scheme == AuthScheme.PERSONAL_ACCESS_TOKEN) {
            let at: AccessToken = (confAuth.parameters as AccessToken);
            return {
                parameters: { 'accessToken': at.accessToken },
                scheme: confAuth.scheme
            }
        }
    }
}