import {Partitions, JobChannels, TaskChannels, AdapterChannels} from "protocol";
import {Platforms}  from "platforms";
import {TestComponent} from "testcomponents";
import {Task} from "task";
import {TestCases} from "result";
import {Pool} from "pool";
import {Message, MessageTransport, TransportClient} from "messagetransport";
import { UniqueID } from "uniqueid";

export class Job extends UniqueID implements TransportClient
{
    private tasks:Task[];
    private results:TestCases[];
    private finished:boolean;
    constructor(
        public transport:MessageTransport,
        public build:string,
        public adapter_id:string, // Friendly name of generating source, Manual, Appveyor, Travis, etc
        public platforms:Platforms[], // List of platforms the job will run on
        public pool:Pool, // Pool to run the job in
        public storage_id:string, // URL or other path to storage for this task (artifacts)
        public tests:TestComponent[]) // List of tests to run for this job
    {
        super();
        // Subscribe to all (null) channels in the job partitions
        // with an address equal to ID
        this.transport.subscribe(this, Partitions.JOBS, null, this.id);
        this.finished = false;
    };

    public onMessage(message:Message)
    {
        if (message.partition == Partitions.JOBS)
        {
            this.handleJobMessage(message);
        }
        if (message.partition == Partitions.TASKS)
        {
            this.handleTaskMessage(message)
        }
    };

    public start()
    {
        for(let platform of this.platforms)
        {
            for(let test of this.tests)
            {
                let task = new Task(
                    this.build,
                    this.id,
                    null,
                    platform,
                    this.pool.id,
                    this.storage_id,
                    test);
                this.transport.subscribe(this, Partitions.TASKS, TaskChannels.RESULT, task.id);
                this.tasks.push(task);
            }
        }
        this.pool.addTasks(this.tasks);
    };

    private abort()
    {
        this.finished = true;
        // For every task without a result
        // mark skipped
        for(let result of this.results)
        {
            let index = this.tasks.indexOf(result.task);
            if (index != -1)
            {
                this.tasks.splice(index, 1);
            }
        }

        for(let task of this.tasks)
        {
            this.results.push(new TestCases(null, [],[], task));
        }
    };

    private handleTaskMessage(message:Message)
    {
        if (message.channel == TaskChannels.RESULT)
        {
            let result = <TestCases> message.content;
            this.addResult(result);
        }
    };

    private addResult(result:TestCases)
    {
        let index = this.tasks.indexOf(result.task);
        if (index != -1)
        {
            this.transport.unsubscribe(this, Partitions.TASKS, TaskChannels.RESULT, result.task.id);
            this.results.push(result);
        }

        if (this.results.length == this.tasks.length)
        {
            this.finished = true;
            this.logResults();
        }
    };

    private handleJobMessage(message:Message)
    {
        switch(message.channel)
        {
            case JobChannels.ABORT:
                this.abort();
            break;

            case JobChannels.START:
                this.start();
                break;

            default:
                break;
        };
    };

    public isFinished(): boolean
    {
        return this.finished;
    };

    public logResults()
    {
        this.transport.sendMessage(new Message(
            Partitions.ADAPTER,
            this.adapter_id,
            AdapterChannels.RESULT,
            this.results));
    };
};
