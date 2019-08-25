import { EndTask } from './EndTask';
import tl = require('azure-pipelines-task-lib/task');


async function runTask() {
    let endTask: EndTask = await EndTask.instance(tl);
    await endTask.run();
}

runTask().catch(err => console.error(err));
