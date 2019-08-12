import {CiEventsList} from "./dto/events/CiEventsList";
import {CiServerInfo} from "./dto/general/CiServerInfo";
import {CiEvent} from "./dto/events/CiEvent";
import {CiEventType, PhaseType, Result} from "./dto/events/CiTypes";

const Octane = require('@microfocus/alm-octane-js-rest-sdk');
const octaneRoutes = require('./octane_routes.js');
const {URL} = require('whatwg-url');
const crypto = require('crypto');
const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');
const util = require('util');
require('util.promisify').shim();
const querystring = require("querystring");

function generateUUID() {
    return crypto.randomBytes(15).toString("hex").replace(/(.{5})/g, '-$1').substring(1);
}

function escapeOctaneQueryValue(q) {
    return q && q.replace(/\\/g, "\\\\");
}

let octane;

async function createCIServerOnDemand(instanceId, serverName, collectionUri, projectId, tl: any, octaneService) {
    let ciServerQuery = Query.field('instance_id').equal(instanceId).or(Query.field('name').equal(escapeOctaneQueryValue(serverName)));
    let ciServers = await util.promisify(octane.ciServers.getAll.bind(octane.ciServers))({query: ciServerQuery});
    console.log(ciServers);
    if (!ciServers || ciServers.length == 0) {
        ciServers = [
            await util.promisify(octane.ciServers.create.bind(octane.ciServers))({
                'instance_id': instanceId && instanceId.trim() || generateUUID(),
                'name': serverName,
                'server_type': 'azure',
                'url': collectionUri + projectId,
                'plugin_version': '2.0.1'
            })
        ];
        console.log(ciServers.length === 1 ? 'CI server ' + ciServers[0].id + ' created' : 'CI server creation failed');
        tl.setVariable('ENDPOINT_DATA_' + octaneService + '_' + 'instance_id'.toUpperCase(), instanceId);
    }
    return ciServers[0];
}

async function createPipelineOnDemand(pipelineName, rootJobName, ciServer) {
    let pipelineQuery = Query.field('name').equal(escapeOctaneQueryValue(pipelineName));
    let pipelines = await util.promisify(octane.pipelines.getAll.bind(octane.pipelines))({query: pipelineQuery});
    if (!pipelines || pipelines.length == 0) {
        pipelines = [
            await util.promisify(octane.pipelines.create.bind(octane.pipelines))({
                'name': pipelineName,
                'ci_server': {'type': 'ci_server', 'id': ciServer.id},
                'root_job_name': rootJobName,
                'notification_track': false,
                'notification_track_tester': false
            })
        ];
        console.log(pipelines.length === 1 ? 'Pipeline ' + pipelines[0].id + ' created' : 'Pipeline creation failed');
    }
    return pipelines[0];
}

async function sendEvent(event, serverInfo) {
    let events = new CiEventsList(serverInfo, [event]);
    const REST_API_SHAREDSPACE_BASE_URL = octane.config.protocol + '://' + octane.config.host + ':' + octane.config.port + '/internal-api/shared_spaces/' + octane.config.shared_space_id;
    let ret = await util.promisify(octane.requestor.put.bind(octane.requestor))({
        url: '/analytics/ci/events',
        baseUrl: REST_API_SHAREDSPACE_BASE_URL,
        json: events.toJSON()
    });
}

export async function run(tl: any) {
    await new Promise(async (resolve, reject) => {
        try {
            let result = tl.execSync(`node`, `--version`);
            console.log('node version = ' + result.stdout);
            let octaneService = tl.getInput('OctaneServiceConnection', true);
            console.log('OctaneService = ' + octaneService);
            let endpointUrl = tl.getEndpointUrl(octaneService, false);
            console.log('rawUrl = ' + endpointUrl);
            let url = new URL(endpointUrl);
            console.log('url.href = ' + url.href);
            let instanceId = tl.getEndpointDataParameter(octaneService, 'instance_id', true);
            console.log('instanceId = ' + instanceId);
            let endpointAuth = tl.getEndpointAuthorization(octaneService, false);
            let clientId = endpointAuth.parameters['username'];
            let clientSecret = endpointAuth.parameters['password'];
            console.log('clientId = ' + clientId);
            console.log('clientSecret = ' + clientSecret);
            let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
            let pparam = url.searchParams.get('p');
            if (pparam === null) {
                reject(paramsError);
                return;
            }
            const spaces = pparam.match(/\d+/g);
            if (!spaces || spaces.length < 2) {
                reject(paramsError);
                return;
            }

            let collectionUri = tl.getVariable("System.TeamFoundationCollectionUri");
            let projectId = tl.getVariable("System.TeamProjectId");
            let projectName = tl.getVariable("System.TeamProject");
            let buildName = tl.getVariable('Build.DefinitionName');
            let buildId = tl.getVariable('Build.BuildId')
            let buildNumber = tl.getVariable('Build.BuildNumber')
            console.log('collectionUri = ' + collectionUri);
            console.log('projectId = ' + projectId);
            console.log('projectName = ' + projectName);
            console.log('buildName = ' + buildName);
            if (!octane) {
                octane = new Octane({
                    protocol: url.protocol.endsWith(':') ? url.protocol.slice(0, -1) : url.protocol,
                    host: url.hostname,
                    port: url.port,
                    shared_space_id: spaces[0],
                    workspace_id: spaces[1],
                    routesConfig: octaneRoutes
                });
            }

            await util.promisify(octane.authenticate.bind(octane))({
                client_id: clientId,
                client_secret: clientSecret
            });

            console.log('Connected');

            instanceId = instanceId && instanceId.trim() || generateUUID();
            console.log("instanceId=" + instanceId);

            let ciServer = await createCIServerOnDemand(instanceId, projectName, collectionUri, projectId, tl, octaneService);
            let pipelineName = projectName + '_' + buildName;
            let pipeline = await createPipelineOnDemand(pipelineName, pipelineName, ciServer);

            let serverInfo = new CiServerInfo('azure', '2.0.1', collectionUri + projectId, instanceId, null, new Date().getTime());
            let startEvent = new CiEvent(buildName, CiEventType.STARTED, buildName, buildNumber, projectName, null, new Date().getTime(), 10000000, 10, null, PhaseType.POST);
            await sendEvent(startEvent, serverInfo);
            await util.promisify((a, f) => setTimeout(f, a))(10000);
            let endEvent = new CiEvent(buildName, CiEventType.FINISHED, buildName, buildNumber, projectName, Result.SUCCESS, new Date().getTime(), 10000000, 10, null, PhaseType.POST);
            await sendEvent(endEvent, serverInfo);
            resolve();
        } catch (ex) {
            reject(ex);
        }
    }).catch(ex => {
        console.log(ex);
        tl.setResult(tl.TaskResult.Failed, 'PipelineInitTask should have passed but failed.');
    });
}