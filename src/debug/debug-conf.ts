import {EndpointDataConstants, InputConstants, SystemVariablesConstants} from "../ExtensionConstants";
import {EndpointAuthorization} from "azure-pipelines-task-lib";

enum LogLevel {
    UNDEFINED = 'UNDEFINED',
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

enum RepositoryType {
    UNDEFINED,
    INTERNAL= 'INTERNAL',
    GIT = 'GIT'
}

enum AuthScheme {
    UNDEFINED,
    USERNAME_PASSWORD = 'username',
    PERSONAL_ACCESS_TOKEN = 'PersonalAccessToken'
}

interface System {
    teamFoundationCollectionUri: string;
    teamProjectId: string;
    teamProject: string;
}

interface Logging {
    logLevel: LogLevel;
}

interface Build {
    sourceBranchName: string;
    definitionName: string;
    buildId: number;
}

interface Octane {
    serviceConnectionName: string;
    workspaces: number[];
    auth: Auth;
}

interface Endpoint {
    url: string;
    octaneInstanceId: string;
    azurePersonalAccessToken: string;
}

interface UsernamePassword {
    username: string;
    password: string;
}

interface AccessToken {
    accessToken: string;
}

interface Auth {
    parameters: UsernamePassword | AccessToken;
    scheme: AuthScheme;
}

interface Repository {
    repositoryConnection: string;
    type: RepositoryType;
    auth: Auth;
}

interface Proxy {
    http: string;
    https: string;
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
        map.set(InputConstants.WORKSPACES_LIST, conf.octane.workspaces.join(','));
        map.set(InputConstants.GITHUB_REPOSITORY_CONNECTION, conf.repository.repositoryConnection);
    }

    private static populateSystemVariablesMap(conf: TomlDebugConf, map: Map<string, any>) {
        map.set(SystemVariablesConstants.ALM_OCTANE_LOG_LEVEL, conf.logging.logLevel.toString());
        map.set(SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI, conf.system.teamFoundationCollectionUri);
        map.set(SystemVariablesConstants.SYSTEM_TEAM_PROJECT_ID, conf.system.teamProjectId);
        map.set(SystemVariablesConstants.BUILD_SOURCE_BRANCH_NAME, conf.build.sourceBranchName);

        map.set(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN, conf.endpoint.azurePersonalAccessToken);
        map.set(EndpointDataConstants.ENDPOINT_DATA_OCTANE_INSTANCE_ID, conf.endpoint.octaneInstanceId);
        map.set(EndpointDataConstants.ENDPOINT_URL, conf.endpoint.url);

        map.set(SystemVariablesConstants.SYSTEM_TEAM_PROJECT, conf.system.teamProject);
        map.set(SystemVariablesConstants.BUILD_BUILD_ID, <number>conf.build.buildId);
        map.set(SystemVariablesConstants.BUILD_DEFINITION_NAME, conf.build.definitionName);
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