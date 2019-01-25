import {Task} from "task";
import {MessageTransport, Message, TransportClient} from "messagetransport";
import { Partitions, WorkerChannels} from "protocol";
import { Platforms } from "platforms";

export enum WorkerState
{
    IDLE,
    BUSY,
    OFFLINE,
    ERROR
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
        this.state = WorkerState.IDLE;
        this.heartbeat = 0;
        this.task = null;
    };


    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case WorkerChannels.HEARTBEAT:
                this.heartbeat = new Date().getTime();
                break;

            case WorkerChannels.STATUS:
                this.state = message.content.state in WorkerState ? message.content.state : WorkerState.ERROR;
                break;
            default:
                break;
        }
    };

    public setTask(task:Task)
    {
        this.state = WorkerState.BUSY;
        this.task = task;
        this.task.started = new Date().getTime();
        this.task.worker_id = this.id;
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
        }
    };
};
