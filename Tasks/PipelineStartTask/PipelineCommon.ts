const Octane = require('@microfocus/alm-octane-js-rest-sdk');
const octaneRoutes = require('./octane_routes.js');
const { URL } = require('whatwg-url');
const crypto = require('crypto');
const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');
const utils = require('./utils');

export function generateUUID() {
    return crypto.randomBytes(15).toString("hex").replace(/(.{5})/g, '-$1').substring(1);
}

let octane;
export async function run(tl: any) {
    await new Promise(async (resolve, reject) => {
        try {
            let result = tl.execSync(`node`, `--version`);
            console.log('node version = ' + result.stdout);
            let octaneService = tl.getInput('OctaneService', true);
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

            await utils.createAsyncApi(octane.authenticate.bind(octane))({
                client_id: clientId,
                client_secret: clientSecret
            });

            console.log('Connected');
            instanceId = instanceId && instanceId.trim() || generateUUID();
            console.log("instanceId=" + instanceId);
            let queryCiServer = Query.field('instance_id').equal(instanceId).or(Query.field('name').equal(projectName));
            let ciServer = await utils.createAsyncApi(octane.ciServers.getAll.bind(octane.ciServers))({ query: queryCiServer });

            if (!ciServer || ciServer.length == 0) {
                await utils.createAsyncApi(octane.ciServers.create.bind(octane.ciServers))({
                    'instance_id': instanceId && instanceId.trim() || generateUUID(),
                    'name': projectName,
                    'server_type': 'Azure DevOps',
                    'url': collectionUri + projectId,
                    'plugin_version': '1.0.0'
                });
                console.log('CI server was created');
                tl.setVariable('ENDPOINT_DATA_' + octaneService + '_' + 'instance_id'.toUpperCase(), instanceId);
            }
            let queryPipeline = Query.field('name').equal(buildName);
            let pipeline = await utils.createAsyncApi(octane.pipelines.getAll.bind(octane.pipelines))({ query: queryPipeline });
            if (!pipeline || pipeline.length == 0) {
                await utils.createAsyncApi(octane.pipelines.create.bind(octane.pipelines))({
                    'name': buildName,
                    'ci_server': { 'type': 'ci_server', 'id': ciServer[0].id },
                    'root_job_name': buildName,
                    'notification_track': false,
                    'notification_track_tester': false
                });
            }
            console.log('Pipeline [' + buildName + '] was created');
            resolve();
        } catch (ex) {
            reject(ex);
        }
    }).catch(ex => {
        console.log(ex);
        tl.setResult(tl.TaskResult.Failed, 'PipelineInitTask should have passed but failed.');
    });
}