// @ts-ignore
import { StartTask } from './StartTask';
// @ts-ignore
import tl = require('azure-pipelines-task-lib');


// @ts-ignore
async function runTask() {
    let startTask: StartTask = await StartTask.instance(tl);
    await startTask.run();
}

runTask().catch(err => console.error(err));
