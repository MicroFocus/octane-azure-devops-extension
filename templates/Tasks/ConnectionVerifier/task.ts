async function runTask() {
    await Promise.resolve();
}

runTask().catch(err => console.error(err));
