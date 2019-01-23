import { Partitions, JobChannels, TaskChannels, AdapterChannels } from "protocol";
import { Task } from "task";
import { Message } from "messagetransport";
import { UniqueID } from "uniqueid";
export class Job extends UniqueID {
    constructor(transport, build, adapter_id, // Friendly name of generating source, Manual, Appveyor, Travis, etc
    platforms, // List of platforms the job will run on
    pool, // Pool to run the job in
    storage_id, // URL or other path to storage for this task (artifacts)
    tests) {
        super();
        this.transport = transport;
        this.build = build;
        this.adapter_id = adapter_id;
        this.platforms = platforms;
        this.pool = pool;
        this.storage_id = storage_id;
        this.tests = tests;
        // Subscribe to all (null) channels in the job partitions
        // with an address equal to ID
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
                let task = new Task(this.build, this.id, null, platform, this.pool.id, this.storage_id, test);
                this.transport.subscribe(this, Partitions.TASKS, TaskChannels.RESULT, task.id);
                this.tasks.push(task);
            }
        }
        this.pool.addTasks(this.tasks);
    }
    ;
    abort() {
        this.finished = true;
        // For every task without a result
        // mark failed
        for (let result of this.results) {
            let index = this.tasks.indexOf(result.task);
            if (index != -1) {
                this.tasks.splice(index, 1);
            }
        }
        for (let task of this.tasks) {
            this.transport.sendMessage(new Message(Partitions.TASKS, TaskChannels.ABORT, task.id, null));
        }
    }
    ;
    handleTaskMessage(message) {
        if (message.channel == TaskChannels.RESULT) {
            let result = message.content;
            this.addResult(result);
        }
    }
    ;
    addResult(result) {
        let index = this.tasks.indexOf(result.task);
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
                this.transport.sendMessage(new Message(Partitions.JOBS, JobChannels.STATUS, this.id, this));
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
        this.transport.sendMessage(new Message(Partitions.ADAPTER, AdapterChannels.RESULT, this.adapter_id, this.results));
    }
    ;
}
;
//# sourceMappingURL=job.js.map