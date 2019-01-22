import {Task} from "task";
import {WorkerState, Worker} from "worker";
import {Partitions, WorkerChannels, PoolChannels} from "protocol";
import {Message, MessageTransport, TransportClient} from "messagetransport";

export class Pool implements TransportClient
{
    private queued_tasks:Task[];
    private active_tasks:Task[];
    private workers:Worker[];
    private query_timer:number;
    private query_interval:number;

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
        this.query_timer = new Date().getTime();
        this.query_interval = 180;
    };

    public onMessage(message:Message)
    {
        switch (message.partition) {
            case Partitions.POOLS:
                this.handlePoolMessage(message);
                break;
            case Partitions.WORKERS:
                this.handleWorkerMessage(message);
                break;
            default:
                break;
        }
    };

    public handlePoolMessage(message:Message)
    {
        switch(message.channel)
        {
            case PoolChannels.QUERY:
                this.transport.sendMessage(new Message(
                    Partitions.POOLS,
                    PoolChannels.STATUS,
                    this.id,
                    this));
                break;
            default:
                break;
        }
    };

    public handleWorkerMessage(message:Message)
    {

    }

    public discoverWorker(message:Message)
    {
        let selected_worker = null;
        for (let worker of this.workers)
        {
            if (worker.id == message.address)
            {
                selected_worker = worker;
                break;
            }
        }
        if (selected_worker == null)
        {
            selected_worker = this.addWorker(new Worker(
                message.content['name'],
                this.id,
                message.content['platform'],
                this.transport,
                180));
        }

        this.transport.sendMessage(new Message(
            Partitions.WORKERS,
            WorkerChannels.CONFIG,
            this.id,
            {
                "pool": this.id
            }));
    };

    public addWorker(worker:Worker)
    {
        if (this.workers.indexOf(worker) == -1)
        {
            worker.pool = this.id;
            this.transport.subscribe(this, Partitions.WORKERS, null, worker.id);
            this.workers.push(worker);
        }
    };

    public removeWorker(worker:Worker)
    {
        let index = this.workers.indexOf(worker);
        if (index != -1)
        {
            this.transport.unsubscribe(this, Partitions.WORKERS, null, worker.id);
            this.workers.splice(index, 1);
        }
    };

    public addTasks(tasks:Task[])
    {
        this.queued_tasks = this.queued_tasks.concat(tasks);
    };

    public process()
    {
        if ((new Date().getTime() - this.query_timer) > this.query_interval)
        {
            this.query_timer = new Date().getTime();
            this.transport.sendMessage(new Message(
                Partitions.WORKERS,
                WorkerChannels.QUERY,
                null,
                { "pool": this.id}));
        }
        // Dequeue tasks to idle workers until we run out of one or the other
        for(let worker of this.workers)
        {
            if (this.queued_tasks.length < 1)
            {
                break;
            }

            if (worker.state == WorkerState.IDLE)
            {
                let task = this.queued_tasks.shift();
                worker.setTask(task);
                this.active_tasks.push(task);
            }
        }
    };
};
