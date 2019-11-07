import {Task, TaskStatus} from "common/task";
import {MessageTransport, Message, TransportClient} from "common/messagetransport";
import { Partitions, WorkerChannels} from "common/protocol";
import { Platforms } from "common/platforms";

export enum WorkerState
{
    IDLE,
    BUSY,
    OFFLINE,
    ERROR,
    TASKED,
    BLACKLISTED
};

export class Worker implements TransportClient
{
    public state:WorkerState;
    public heartbeat:number;
    public task:Task;

    constructor(
        public id:string,
        public pool_id:string,
        public platform:Platforms,
        public transport:MessageTransport,
        public timeout:number = 180)
    {
        this.transport.subscribe(this, Partitions.WORKERS, null, this.id);
        this.state = WorkerState.OFFLINE;
        this.heartbeat = 0;
        this.task = null;
        setInterval(() => this.checkHeartbeat(), 500 * this.timeout); // Nyquist frequency and ms conversion
    };

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case WorkerChannels.HEARTBEAT:
                this.heartbeat = new Date().getTime();
                break;
            case WorkerChannels.STATUS:
                if (this.state != WorkerState.TASKED)
                {
                    this.state = message.content.state in WorkerState ? message.content.state : WorkerState.ERROR;
                }
                break;
            case WorkerChannels.ACCEPT:
                this.state = WorkerState.BUSY;
                this.task.status = TaskStatus.RUNNING;
                break;
            case WorkerChannels.ERROR:
                this.state = WorkerState.ERROR;
                this.task.status = TaskStatus.INCONCLUSIVE;
                break;
            case WorkerChannels.ABORT:
                this.state = WorkerState.IDLE;
                this.task.status = TaskStatus.CANCELLED;
                break;
            default:
                break;
        }
    };

    public setTask(task:Task)
    {
        this.state = WorkerState.TASKED;
        this.task = task;
        this.task.started = new Date().getTime();
        this.task.worker_id = this.id;
        console.log("Tasking " + this.id);
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.TASK,
            this.id,
            task.toJSON());
    };

    public destroy()
    {
        this.transport.unsubscribe(this, Partitions.WORKERS, null, this.id);
    };

    public finish()
    {
        this.state = WorkerState.IDLE;
        this.task = null;
    };

    public checkHeartbeat()
    {
        if ((new Date().getTime() - this.heartbeat) > this.timeout)
        {
            this.state = WorkerState.OFFLINE;
            this.task.status = TaskStatus.CANCELLED;
        }
    };
};
