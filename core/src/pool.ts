import {Task} from "common/task";
import {WorkerState, Worker} from "common/worker";
import {Partitions, WorkerChannels, PoolChannels, TaskChannels } from "common/protocol";
import {Message, MessageTransport, TransportClient} from "common/messagetransport";

export class Pool implements TransportClient
{
    protected queued_tasks:Task[];
    protected active_tasks:Task[];
    protected query_timer:number;
    protected query_interval:number;
    public workers:Worker[];

    constructor(
        public id:string,
        public transport:MessageTransport,
        public limit:number)
    {
        this.transport.subscribe(
            this,
            Partitions.POOLS,
            null,
            this.id);
        this.transport.subscribe(
            this,
            Partitions.WORKERS,
            WorkerChannels.STATUS,
            null);
        this.transport.subscribe(
            this,
            Partitions.TASKS,
            TaskChannels.RESULT,
            null);
        this.transport.subscribe(
            this,
            Partitions.TASKS,
            TaskChannels.ABORT,
            null);
        this.queued_tasks = [];
        this.active_tasks = [];
        this.workers = [];
        this.query_timer = new Date().getTime();
        this.query_interval = 180000;
    };

    public onMessage(message:Message)
    {
      switch(message.channel)
        {
            case PoolChannels.QUERY:
                this.transport.sendMessage(
                    Partitions.POOLS,
                    PoolChannels.STATUS,
                    this.id,
                    this);
                break;
            case PoolChannels.TASK:
                this.addTasks(message.content);
                break;
            case TaskChannels.ABORT:
                {
                    let index = this.queued_tasks.findIndex((task) => task.id == message.address);
                    if (index != -1)
                    {
                        this.queued_tasks.splice(index, 1);
                    }
                }
                {
                    let index = this.active_tasks.findIndex((task)=> task.id == message.address);
                    if (index != -1)
                    {
                        this.active_tasks.splice(index, 1);
                    }
                }
                break;
            case TaskChannels.RESULT:
                {
                    let index = this.active_tasks.findIndex((task)=> task.id == message.address);
                    if (index != -1)
                    {
                        this.active_tasks.splice(index, 1);
                    }
                }
                break;
            case WorkerChannels.STATUS:
                // Check that worker still belongs to us
                // otherwise remove
                let index = this.workers.findIndex((w) => w.id == message.address);
                if (typeof(message.content.pool_id) != 'undefined')
                {
                    if (index != -1)
                    {
                        if(message.content.pool_id != this.id)
                        {
                            this.removeWorker(this.workers[index]);
                        }
                    } else {
                        if (message.content.pool_id == this.id)
                        {
                            this.discoverWorker(message);
                        }
                    }
                }
                break;
            default:
                break;
        }
    };

    public discoverWorker(message:Message)
    {
        let selected_worker:Worker = null;
        for (let worker of this.workers)
        {
            if (worker.id == message.address)
            {
                selected_worker = worker;
                break;
            }
        }
        if (!selected_worker)
        {
            selected_worker = new Worker(
                message.address,
                this.id,
                message.content.platform,
                this.transport,
                180000);
            this.addWorker(selected_worker);
        }

        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.CONFIG,
            selected_worker.id,
            {
                "pool_id": this.id
            });
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
                this.active_tasks.push(task);
            }
        }
    };
};
