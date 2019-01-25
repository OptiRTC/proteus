import { Partitions, JobChannels, TaskChannels, AdapterChannels, PoolChannels } from "protocol";
import { Task } from "task";
import { TestCaseResults } from "result";
import { UniqueID } from "uniqueid";
export class Job extends UniqueID {
    constructor(transport, build, adapter_id, // Friendly name of generating source, Manual, Appveyor, Travis, etc
    platforms, // List of platforms the job will run on
    pool_id, // Pool to run the job in
    storage_id, // URL or other path to storage for this task (artifacts)
    tests) {
        super();
        this.transport = transport;
        this.build = build;
        this.adapter_id = adapter_id;
        this.platforms = platforms;
        this.pool_id = pool_id;
        this.storage_id = storage_id;
        this.tests = tests;
        // Subscribe to all (null) channels in the job partitions
        // with an address equal to ID
        this.tasks = [];
        this.results = [];
        this.transport.subscribe(this, Partitions.JOBS, null, this.id);
        this.finished = false;
    }
    ;
    onMessage(message) {
        if (message.partition == Partitions.JOBS) {
            this.handleJobMessage(message);
        }
        if (message.partition == Partitions.TASKS) {
            this.handleTaskMessage(message);
        }
    }
    ;
    start() {
        for (let platform of this.platforms) {
            for (let test of this.tests) {
                let task = new Task({
                    build: this.build,
                    job_id: this.id,
                    worker_id: null,
                    platform: platform,
                    pool_id: this.pool_id,
                    storage_id: this.storage_id,
                    test: test.toJSON()
                });
                this.transport.subscribe(this, Partitions.TASKS, TaskChannels.RESULT, task.id);
                this.tasks.push(task);
            }
        }
        this.transport.sendMessage(Partitions.POOLS, PoolChannels.TASK, this.pool_id, this.tasks);
    }
    ;
    abort() {
        this.finished = true;
        // For every task without a result
        // mark failed
        let pending_tasks = this.tasks.filter((t) => this.results.findIndex((r) => r.task == t) == -1);
        for (let task of pending_tasks) {
            task.abort(this.transport);
        }
    }
    ;
    handleTaskMessage(message) {
        if (message.channel == TaskChannels.RESULT) {
            let result = new TestCaseResults(message.content);
            result.populateSkipped();
            this.addResult(result);
        }
    }
    ;
    addResult(result) {
        let index = this.tasks.findIndex((t) => t.id == result.task.id);
        if (index != -1) {
            this.transport.unsubscribe(this, Partitions.TASKS, TaskChannels.RESULT, result.task.id);
            this.results.push(result);
        }
        if (this.results.length == this.tasks.length) {
            this.finished = true;
            this.logResults();
        }
    }
    ;
    handleJobMessage(message) {
        switch (message.channel) {
            case JobChannels.ABORT:
                this.abort();
                break;
            case JobChannels.START:
                this.start();
                break;
            case JobChannels.QUERY:
                this.transport.sendMessage(Partitions.JOBS, JobChannels.STATUS, this.id, this);
                break;
            default:
                break;
        }
        ;
    }
    ;
    isFinished() {
        return this.finished;
    }
    ;
    logResults() {
        this.transport.sendMessage(Partitions.ADAPTER, AdapterChannels.RESULT, this.adapter_id, this.results);
    }
    ;
}
;
//# sourceMappingURL=job.js.map