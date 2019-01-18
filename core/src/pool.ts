import {Task, TaskStatus} from "common/task";
import {WorkerState, Worker} from "common/worker";
import { Platforms } from "common/platforms";
import { Job } from "core/job";

export class Pool
{
    protected jobs:Job[];
    protected query_timer:number;
    protected query_interval:number;
    public workers:Worker[];

    constructor(
        public id:string,
        public limit:number)
    {
        this.jobs = [];
        this.workers = [];
    };

    public addWorker(worker:Worker)
    {
        if (this.workers.findIndex((w) => (w.id == worker.id)) == -1)
        {
            this.workers.push(worker);
        }
    };

    public removeWorker(worker:Worker)
    {
        let index = this.workers.findIndex((w) => worker.id == w.id);
        if (index != -1)
        {
            this.workers.splice(index, 1);
        }
    };

    public addJob(job:Job)
    {
        this.jobs.push(job);
    };

    public getNextJobTask(platform:Platforms):Task
    {
        let task = null;
        for(let job of this.jobs)
        {
            task = job.nextTask(platform);
            if (task != null)
            {
                break;
            }
        }
        return task;
    };

    public getIdleWorkers():Worker[]
    {
        return this.workers.filter((w:Worker) => w.state == WorkerState.IDLE);
    };

    public getDisabledWorkers():Worker[]
    {
        return this.workers.filter((w:Worker) => w.state == WorkerState.ERROR || w.state == WorkerState.OFFLINE);
    };

    public process()
    {
        for(let worker of this.workers)
        {
            if (worker.state == WorkerState.IDLE)
            {
                let task = this.getNextJobTask(worker.platform);
                if (task == null || task == undefined)
                {
                    continue;
                }
                console.log("Dequeued Task " + task.test.name);
                worker.setTask(task);
                task.status = TaskStatus.RUNNING;
            }
        }
    };
};
