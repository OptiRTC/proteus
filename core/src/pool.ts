import {TaskStatus, Task} from "common/task";
import {WorkerState, Worker} from "common/worker";
import {Partitions, WorkerChannels, PoolChannels, TaskChannels } from "common/protocol";
import {Message, MessageTransport, TransportClient, ArrayFromJSON } from "common/messagetransport";
import {TestCaseResults} from "common/result";

export class Pool implements TransportClient
{
    protected tasks:Task[];
    protected query_timer:number;
    protected query_interval:number;
    protected PENDING_TIMEOUT:number;
    public workers:Worker[];

    constructor(
        public id:string,
        public transport:MessageTransport,
        public limit:number)
    {
        this.PENDING_TIMEOUT = 15000;
        this.transport.subscribe(
            this,
            Partitions.POOLS,
            null,
            this.id);
        this.transport.subscribe(
            this,
            Partitions.WORKERS,
            null,
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
        this.tasks = [];
        this.workers = [];
        this.query_timer = new Date().getTime();
        this.query_interval = 180000;
    };

    public onMessage(message:Message)
    {
      switch(message.partition)
        {
            case Partitions.POOLS:
                this.handlePoolMessage(message);
                break;
            case Partitions.WORKERS:
                this.handleWorkerMessage(message);
                break;
            case Partitions.TASKS:
                this.handleTaskMessage(message);
                break;
            default:
                break;
        }
    };

    public handleTaskMessage(message:Message)
    {
        let task = this.tasks.find((t) => t.id == message.address);
        switch(message.channel)
        {
            case TaskChannels.ABORT:
                {
                    if (typeof(task) != "undefined")
                    {
                        task.status = TaskStatus.PENDING;
                        task.error_count += 1;
                    }
                }
                break;
            case TaskChannels.RESULT:
                {
                    if (typeof(task) != "undefined")
                    {
                        let result = new TestCaseResults(message.content);
                        task.status = result.failed.length > 0 ? TaskStatus.FAILED : TaskStatus.PASSED;
                        this.transport.sendMessage(
                            Partitions.POOLS,
                            PoolChannels.RESULT,
                            this.id,
                            result.toJSON()
                        );
                    }
                }
                break;
            default:
                break;
        }
    }

    public handlePoolMessage(message:Message)
    {
        switch(message.channel)
        {
            case PoolChannels.QUERY:
                this.transport.sendMessage(
                    Partitions.POOLS,
                    PoolChannels.STATUS,
                    this.id,
                    {
                        pending_task_count: this.pendingCount(),
                        active_task_count: this.activeCount(),
                        queued_task_count: this.queuedCount(),
                        workers: this.workers.map((worker:Worker) => {
                            return {
                                id: worker.id,
                                platform: worker.platform,
                                state: worker.state,
                                task: worker.task.toJSON(),
                                pool_id: worker.pool_id
                                };
                        }),
                        id: this.id,
                        limit: this.limit
                    });
                break;
            case PoolChannels.TASK:
                this.addTasks(ArrayFromJSON<Task>(Task, message.content));
                break;
            default:
                break;
        }
    }

    public handleWorkerMessage(message:Message)
    {
        switch(message.channel)
        {
            case WorkerChannels.STATUS:
                // Check that worker still belongs to us
                // otherwise remove
                {
                    let worker = null;
                    let index = this.workers.findIndex((w) => w.id == message.address);
                    if (typeof(message.content.pool_id) != 'undefined')
                    {
                        if (index != -1)
                        {
                            worker = this.workers[index];
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
                    if (worker == null)
                    {
                        break;
                    }
                    // If Worker has active tasks and isn't busy
                    // this might happen if a worker resets in the middle of a job
                    if (worker.state != WorkerState.BUSY)
                    {
                        let index = this.tasks.findIndex((task) => (task.worker_id == worker.id) && (task.status == TaskStatus.RUNNING));
                        if (index != -1)
                        {
                            let task = this.tasks[index];
                            task.worker_id = null;
                            task.status = TaskStatus.NONE;
                        }
                    }
                }
                break;
            case WorkerChannels.ACCEPT:
                // Move task from pending to active
                {
                    let task = this.tasks.find((task) => task.id == message.content.task_id);
                    if (typeof(task) != "undefined")
                    {
                        task.status = TaskStatus.RUNNING;
                        this.transport.sendMessage(
                            Partitions.TASKS,
                            TaskChannels.STATUS,
                            task.id,
                            task.toJSON());
                    }
                }
                break;
            case WorkerChannels.REJECT:
                // Move task back into queue
                {
                    let task = this.tasks.find((task) => task.id == message.content.task_id);
                    if (typeof(task) != "undefined")
                    {
                        task.status = TaskStatus.NONE;
                    }
                }
                break;
            default:
                break;
        }
    }

    public discoverWorker(message:Message)
    {
        let selected_worker:Worker = null;
        for (let worker of this.workers)
        {
            if (worker.id == message.address)
            {
                selected_worker = worker;
                this.tasks.forEach((task) => {
                    if (task.worker_id == worker.id)
                    {
                        worker.error();
                        task.error_count += 1;
                        task.status = TaskStatus.NONE;
                    }
                });
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
        selected_worker.state = message.content.state || WorkerState.IDLE;
        selected_worker.platform = message.content.platform || selected_worker.platform;
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
            task.status = TaskStatus.NONE;
        }
        this.tasks = this.tasks.concat(tasks);
    };

    public getPlatformTask(worker:Worker):Task
    {
        return this.tasks.find((t)=> t.platform == worker.platform && t.status == TaskStatus.NONE);
    };

    public queuedCount():number
    {
        return this.tasks.filter((task) => task.status == TaskStatus.NONE).length;
    };

    public pendingCount(): number
    {
        return this.tasks.filter((task) => task.status == TaskStatus.PENDING).length;
    };

    public activeCount():number
    {
        return this.tasks.filter((task) => task.status == TaskStatus.RUNNING).length;
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
                if (typeof(task) == "undefined")
                {
                    continue;
                }

                worker.setTask(task);
                setTimeout(() => {
                    let found_task = this.tasks.find((t) => t.id == task.id);
                    if(typeof(found_task) != "undefined" && found_task.status == TaskStatus.PENDING)
                    {
                        worker.error();
                        found_task.status = TaskStatus.NONE;
                    } 
                }, this.PENDING_TIMEOUT);
            }
        }

        this.tasks = this.tasks.filter((task) => task.status != TaskStatus.PASSED && task.status != TaskStatus.FAILED);
    };

    public statusPayload()
    {
        let payload = {
            queued_tasks: this.queuedCount(),
            active_tasks: this.activeCount(),
            pending_tasks: this.pendingCount(),
            id: this.id,
            workers: []
        };

        console.log(`Pool ${this.id} Queued: ${this.queuedCount()} Pending: ${this.pendingCount()} Active: ${this.activeCount()}`);

        for(let worker of this.workers)
        {
            payload.workers.push(worker.statusPayload());
        }

        return payload;
    };
};
