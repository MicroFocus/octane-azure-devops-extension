// @ts-ignore
import { EndTask } from './EndTask';
// @ts-ignore
import tl = require('azure-pipelines-task-lib');


// @ts-ignore
async function runTask() : Promise<void> {
    let endTask: EndTask = await EndTask.instance(tl);
    await endTask.run();
}

runTask().catch(err => console.error(err));
