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
};

export class Worker implements TransportClient
{
    protected max_errors:number = 3;
    public state:WorkerState;
    public heartbeat:number;
    public task:Task;

    constructor(
        public id:string,
        public pool_id:string,
        public platform:Platforms,
        public transport:MessageTransport,
        public timeout:number = 180,
        public error_count:number = 0)
    {
        this.transport.subscribe(this, Partitions.WORKERS, null, this.id);
        this.state = WorkerState.OFFLINE;
        this.heartbeat = 0;
        this.task = null;
    };

    public error()
    {
        this.error_count += 1;
        if (this.error_count >= this.max_errors)
        {
            console.log("Blacklisting " + this.id);
            this.state = WorkerState.ERROR;
        }
    }

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case WorkerChannels.HEARTBEAT:
                this.heartbeat = new Date().getTime();
                break;

            case WorkerChannels.STATUS:
                if (this.state != WorkerState.TASKED &&
                    this.state != WorkerState.ERROR)
                {
                    this.state = message.content.state in WorkerState ? message.content.state : WorkerState.ERROR;
                }
                break;
            case WorkerChannels.ACCEPT:
                this.state = WorkerState.BUSY;
                break;
            case WorkerChannels.ERROR:
                this.state = WorkerState.ERROR;
                break;
            default:
                break;
        }
    };

    public setTask(task:Task)
    {
        this.state = WorkerState.TASKED;
        this.task = task;
        task.status = TaskStatus.PENDING;
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

    public statusPayload()
    {
        let payload = {
           state: this.state,
           heartbeat: this.heartbeat,
           task: this.task,
           id: this.id,
           pool_id: this.pool_id,
           platform: this.platform,
           error_count: this.error_count
        };
        console.log(`Worker ${this.id} Pool: ${this.pool_id}, Platform: ${this.platform}, Errors: ${this.error_count}, State: ${this.state}, Heartbeat: ${this.heartbeat}`);
        if (typeof(this.task) != "undefined" && this.task != null)
        {
            console.log(this.task.test.name);
        }

        return payload;
    };
};
