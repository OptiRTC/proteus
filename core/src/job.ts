import {Partitions, JobChannels, TaskChannels, AdapterChannels, PoolChannels} from "common/protocol";
import {Platforms}  from "common/platforms";
import {TestComponent} from "common/testcomponents";
import {Task} from "common/task";
import {TestCaseResults} from "common/result";
import { Message, MessageTransport, TransportClient, ArrayToJSON } from "common/messagetransport";
import { UniqueID } from "common/uniqueid";

export class Job extends UniqueID
{
    protected tasks:Task[];
    protected results:TestCaseResults[];
    protected finished:boolean;
    constructor(
        public build:string,
        public adapter_id:string, // Friendly name of generating source, Manual, Appveyor, Travis, etc
        public platforms:Platforms[], // List of platforms the job will run on
        public pool_id:string, // Pool to run the job in
        public storage:Storage, // URL or other path to storage for this task (artifacts)

        public tests:TestComponent[]) // List of tests to run for this job
    {
        super();
        // Subscribe to all (null) channels in the job partitions
        // with an address equal to ID
        this.tasks = [];
        this.results = [];
        this.finished = false;
    };

    public start()
    {
        // Obtain storage
        for(let platform of this.platforms)
        {
            for(let test of this.tests)
            {
                let task = new Task({
                    build: this.build,
                    job_id: this.id,
                    worker_id: null,
                    platform: platform,
                    pool_id: this.pool_id,
                    storage_id: this.storage.id,
                    test: test.toJSON()});
                this.tasks.push(task);
            }
        }
    };

    public abort()
    {
        this.finished = true;
        // For every task without a result
        // mark failed
        let pending_tasks = this.tasks.filter((t) => this.results.findIndex((r) => r.task == t) == -1);
        
        for(let task of pending_tasks)
        {
            task.abort();
        }
    };

    protected handleTaskMessage(message:Message)
    {
        if (message.channel == TaskChannels.RESULT)
        {
            let result = new TestCaseResults(message.content);
            result.populateSkipped();
            this.addResult(result);
        }
    };

    protected addResult(result:TestCaseResults)
    {
        let index = this.tasks.findIndex((t) => t.id == result.task.id);
        if (index != -1)
        {
            this.results.push(result);
        }

        if (this.results.length == this.tasks.length)
        {
            this.finished = true;
        }
    };

    public isFinished(): boolean
    {
        return this.finished;
    };

    public process()
    {
        // Noop
    };
};
