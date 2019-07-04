import tl = require('azure-pipelines-task-lib/task');

async function index() {
    const octaneService = tl.getInput('OctaneService', true);
    console.log('OctaneService = ' + octaneService);
    const url = tl.getEndpointUrl(octaneService, false);
    console.log('Mandatory URL = ' + url);
}

index();