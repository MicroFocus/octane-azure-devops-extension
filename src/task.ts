import { EndTask } from './EndTask';
import {PipelinesOrchestratorTask} from "./PipelinesOrchestratorTask";
import tl = require('azure-pipelines-task-lib');
import {StartTask} from "./StartTask";
import * as TaskJson from "./task.json"
import {TestRunnerStartTask} from "./TestRunnerStartTask";

async function runTask() : Promise<void> {
    if(TaskJson.name.includes('octane-start-task')) {
        await runStartTask();
    } else if(TaskJson.name.includes('octane-end-task')) {
        await runEndTask();
    } else if(TaskJson.name.includes('octane-pipelines-orchestrator-task')) {
        await runPipelinesOrchestrator();
    } else if(TaskJson.name.includes('octane-test-runner-start-task')) {
        await runTestRunnerStartTask();
    } else {
        throw Error('Wrong task.json file!');
    }
}

async function runTestRunnerStartTask(){
    let testRunnerStartTask: TestRunnerStartTask = await TestRunnerStartTask.instance(tl);
    await testRunnerStartTask.run();
}
async function runStartTask() {
    let startTask: StartTask = await StartTask.instance(tl);
    await startTask.run();
}

async function runEndTask() {
    let endTask: EndTask = await EndTask.instance(tl);
    await endTask.run();
}

async function runPipelinesOrchestrator() {
    let endTask: PipelinesOrchestratorTask = await PipelinesOrchestratorTask.instance(tl);
    await endTask.run();
}

runTask().catch(err => console.error(err));
