import {DebugConf} from "./debug-conf";
import {AzurePipelineTaskLibMock} from "./task-mock-initializer";
import {EndpointDataConstants, InputConstants} from "../ExtensionConstants";
import {EndpointAuthorization} from "azure-pipelines-task-lib";
import {initDebugConfFromInputParametersFile} from "./debug-conf-file-initializer";
import {OctaneConnectionUtils} from "../OctaneConnectionUtils";
import {URL} from "url";
import { nanoid } from 'nanoid';
import {MetadataUtils} from "../MetadataUtils";

let azureTaskMock: AzurePipelineTaskLibMock = <AzurePipelineTaskLibMock>{};
let conf: DebugConf;
let url: URL;
let customWebContext: string;
let sharedSpaceId: string;
let workspaces: any;
let analyticsCiInternalApiUrlPart: string;
let selfIdentity: string;

let SHARED_SPACE_INTERNAL_API_PATH_PART = "/internal-api/shared_spaces/";
let SHARED_SPACE_API_PATH_PART = "/api/shared_spaces/";
let ANALYTICS_CI_PATH_PART = "/analytics/ci/";
let VULNERABILITIES = "/vulnerabilities";
let VULNERABILITIES_PRE_FLIGHT = "/vulnerabilities/preflight";
let OPEN_VULNERABILITIES_FROM_OCTANE = "/vulnerabilities/remote-issue-ids";
let ACCEPT_HEADER = "accept";
let CORRELATION_ID_HEADER = "X-Correlation-ID";
let CONTENT_TYPE_HEADER = "content-type";
let CONTENT_ENCODING_HEADER = "content-encoding";
let GZIP_ENCODING = "gzip";
let SCMDATA_API_PATH_PART = "/scm-commits";

function printNodeVersion() {
    // let envNodeVersion = azureTaskMock.execSync(`node`, `--version`);
    // console.log('Env node version: ' + envNodeVersion.stdout);

    let processArgNodeVersion = process.argv[0];
    if (processArgNodeVersion.includes("node.exe")) {
        console.log('Process argv node version: ' + processArgNodeVersion);
    }
}

function printOctaneServiceConnectionDetails() {
    // let octaneServiceConnection = azureTaskMock.getInput(InputConstants.OCTANE_SERVICE_CONNECTION);
    // let endpointAuth: EndpointAuthorization = azureTaskMock.getEndpointAuthorization(octaneServiceConnection);
    //
    // console.log('Octane service connection: ' + octaneServiceConnection);
    // console.log('Authentication scheme: ' + endpointAuth.scheme);
    // console.log('Parameters: ' + endpointAuth.parameters);
}

function validateOctaneUrlAndExtractSharedSpaceId() {
    let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
    let params = url.searchParams.get('p');
    if (params === null) {
        throw new Error(paramsError);
    }

    const spaces = params.match(/\d+/g);
    if (!spaces || spaces.length < 1) {
        throw new Error(paramsError);
    }

    sharedSpaceId = spaces[0];
}

function prepareOctaneUrlAndCustomWebContext() {
    let endpointUrl = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_URL);
    url = new URL(endpointUrl);

    console.log('rawUrl = ' + endpointUrl + '; url.href = ' + url.href);

    customWebContext = url.pathname.toString().split('/ui/')[0].substring(1);
    console.log('customWebContext = ' + customWebContext);
}

function prepareWorkspaces() {
    workspaces = conf.input.get(InputConstants.WORKSPACES_LIST);

    console.log('workspaces = ' + workspaces);

    workspaces = workspaces.split(',').map(s => s.trim());
}

function buildAnalyticsCiInternalApiUrlPart() {
    analyticsCiInternalApiUrlPart = SHARED_SPACE_INTERNAL_API_PATH_PART + sharedSpaceId + ANALYTICS_CI_PATH_PART;
}

function prepareSelfIdentity() {
    selfIdentity = conf.systemVariables.get(EndpointDataConstants.ENDPOINT_DATA_OCTANE_INSTANCE_ID); //nanoid() + "ScheduledPipelineTaskDebug";
}

function initialize() {
    conf = initDebugConfFromInputParametersFile();
    printNodeVersion();
    printOctaneServiceConnectionDetails();

    prepareSelfIdentity();
    prepareOctaneUrlAndCustomWebContext();
    validateOctaneUrlAndExtractSharedSpaceId();
    prepareWorkspaces();
    buildAnalyticsCiInternalApiUrlPart();
}

function buildGetAbridgedTaskAsyncQueryParams() {
    let result = "?";
    result = result + "self-type=" + "azure_devops";
    result = result + "&self-url=" + "";// SystemVariablesConstants.SYSTEM_TEAM_FOUNDATION_COLLECTION_URI when running from AzureDevOps should be
    result = result + "&api-version=" + "1";
    result = result + "&sdk-version=" + "0";
    result = result + "&plugin-version=" + "1";
    result = result + "&client-id=" + "";
    result = result + "&ci-server-user=" + "";

    return result;
}

async function runScheduledTask() {
    let clientId = conf.octaneAuthentication.parameters['username'];
    let clientSecret = conf.octaneAuthentication.parameters['password'];

    let octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(url, customWebContext, sharedSpaceId,
        workspaces[0], clientId, clientSecret);
    await MetadataUtils.enhanceOctaneSDKConnectionWithEntitiesMetadata(octaneSDKConnection);

    let counter = 0;
    let fn = async () => {
        let eventObj = {
            url: analyticsCiInternalApiUrlPart +'/servers/' + selfIdentity + "/tasks" + buildGetAbridgedTaskAsyncQueryParams(),
            headers: {ACCEPT_HEADER: 'application/json'},
            json: true,
            body: ""
        }

        let ret;
        try {
            ret = await octaneSDKConnection._requestHandler._requestor.get(eventObj);
            console.log(ret);
        } catch(e) {
            console.log(e);
        } finally {
            if (counter < 10) {
                console.log('scheduling a new request');
                setTimeout(fn, 5 * 1000);
            }

            counter++;
        }
    }

    setTimeout(fn, 5 * 1000);
}

initialize();
runScheduledTask().catch(err => console.error(err));