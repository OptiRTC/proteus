import {TaskStatus, Task} from "common/task";
import {WorkerState, Worker} from "common/worker";
import {Partitions, WorkerChannels, PoolChannels, TaskChannels } from "common/protocol";
import {Message, MessageTransport, TransportClient, ArrayFromJSON } from "common/messagetransport";

export class Pool
{
    protected queued_tasks:Task[];
    protected active_tasks:Task[];
    protected pending_tasks:Task[];
    protected query_timer:number;
    protected query_interval:number;
    public workers:Worker[];

    constructor(
        public id:string,
        public limit:number)
    {
        this.queued_tasks = [];
        this.active_tasks = [];
        this.pending_tasks = [];
        this.workers = [];
        this.query_timer = new Date().getTime();
        this.query_interval = 180000;
    };

    public addWorker(worker:Worker)
    {
        if (this.workers.findIndex((w) => (w.id == worker.id)) == -1)
        {
            worker.pool_id = this.id;
            this.workers.push(worker);
        }
    };

    public removeWorker(worker:Worker)
    {
        let index = this.workers.findIndex((w) => worker.id == w.id);
        if (index != -1)
        {
            worker.destroy();
            this.workers.splice(index, 1);
        }
    };

    public addTasks(tasks:Task[])
    {
        for(let task of tasks)
        {
            task.pool_id = this.id;
        }
        this.queued_tasks = this.queued_tasks.concat(tasks);
    };

    public getPlatformTask(worker:Worker):Task
    {
        let index = this.queued_tasks.findIndex((t)=> t.platform == worker.platform);
        if (index == -1)
        {
            return null;
        }
        let task = this.queued_tasks[index];
        this.queued_tasks.splice(index, 1);
        return task;
    };

    public queueSize():number
    {
        return this.queued_tasks.length;
    };

    public activeCount():number
    {
        return this.active_tasks.length;
    };

    public process()
    {
        if ((new Date().getTime() - this.query_timer) > this.query_interval)
        {
            this.query_timer = new Date().getTime();
            this.transport.sendMessage(
                Partitions.WORKERS,
                WorkerChannels.QUERY,
                null,
                { "pool_id": this.id});
        }
        // Dequeue tasks to idle workers until we run out of one or the other
        for(let worker of this.workers)
        {
            if (worker.state == WorkerState.IDLE)
            {
                let task = this.getPlatformTask(worker);
                if (task == null || task == undefined)
                {
                    continue;
                }
                worker.setTask(task);
                this.pending_tasks.push(task);
            }
        }
    };
};
