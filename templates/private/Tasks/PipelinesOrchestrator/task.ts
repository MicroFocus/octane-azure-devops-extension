// @ts-ignore
import { PipelinesOrchestratorTask } from './PipelinesOrchestratorTask';
// @ts-ignore
import tl = require('azure-pipelines-task-lib');


// @ts-ignore
async function runTask() : Promise<void> {
    let endTask: PipelinesOrchestratorTask = await PipelinesOrchestratorTask.instance(tl);
    await endTask.run();
}

runTask().catch(err => console.error(err));
