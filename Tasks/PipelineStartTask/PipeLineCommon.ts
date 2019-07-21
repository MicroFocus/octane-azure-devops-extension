const Octane = require('@microfocus/alm-octane-js-rest-sdk');
const octaneRoutes = require('./octane_routes.js');
const {URL} = require('whatwg-url');
const crypto = require('crypto');

export function generateUUID() {
    return crypto.randomBytes(15).toString("hex").replace(/(.{5})/g, '-$1').substring(1);
}  

export async function run(tl: any) {
    await new Promise((resolve, reject) => {
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
            console.log('collectionUri = ' + collectionUri);
            console.log('projectId = ' + projectId);
            console.log('projectName = ' + projectName);
            var octane = new Octane({
                protocol: url.protocol.endsWith(':') ? url.protocol.slice(0, -1) : url.protocol,
                host: url.hostname,
                port: url.port,
                shared_space_id: spaces[0],
                workspace_id: spaces[1],
                routesConfig: octaneRoutes
            });

            octane.authenticate({
                client_id: clientId,
                client_secret: clientSecret
            }, (err: any) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Connected');
                    instanceId = instanceId && instanceId.trim() || generateUUID();
                    console.log("instanceId=" +  instanceId);
                    octane.ciServers.create({
                        'instance_id': instanceId && instanceId.trim() || generateUUID(),
                        'name': projectName,
                        'server_type': 'Azure DevOps',
                        'url': collectionUri + projectId,
                        'plugin_version': '1.0.0'
                    }, (err: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log('Created');
                            resolve();
                        }
                    });
                }
            });
        } catch (ex) {
            reject(ex);
        }
    }).catch(ex => {
        throw ex;
    });
}