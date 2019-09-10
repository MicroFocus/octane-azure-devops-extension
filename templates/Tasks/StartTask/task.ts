import { StartTask } from './StartTask';
import tl = require('azure-pipelines-task-lib');


async function runTask() {
    let startTask: StartTask = await StartTask.instance(tl);
    await startTask.run();
}

runTask().catch(err => console.error(err));
