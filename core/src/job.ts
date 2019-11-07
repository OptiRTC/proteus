import {Platforms}  from "common/platforms";
import {TestComponent} from "common/testcomponents";
import {Task, TaskStatus} from "common/task";
import {TestCaseResults} from "common/result";
import { UniqueID } from "common/uniqueid";
import { ProteusStorage } from "common/storage";

export class Job extends UniqueID
{
    protected tasks:Task[];
    public results:TestCaseResults[];
    protected finished:boolean;

    constructor(
        public build:string,
        public adapter_id:string, // Friendly name of generating source, Manual, Appveyor, Travis, etc
        public platform:Platforms, // List of platforms the job will run on
        public pool_id:string, // Pool to run the job in
        public storage:ProteusStorage, // URL or other path to storage for this task (artifacts)

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
        console.log("Starting job" + this.id);
        for(let test of this.tests)
        {
            let task = new Task({
                build: this.build,
                job_id: this.id,
                worker_id: null,
                platform: this.platform,
                pool_id: this.pool_id,
                storage_id: this.storage.id,
                test: test.toJSON()});
            this.tasks.push(task);
        }
    };

    public abort()
    {
        this.finished = true;
        // For every task without a result
        // mark failed
        let unfinished = this.tasks.filter((t:Task) => 
            t.status == TaskStatus.NONE ||
            t.status == TaskStatus.RUNNING ||
            t.status == TaskStatus.PENDING);
        for(let task of unfinished)
        {
            task.status = TaskStatus.CANCELLED;
        }
    };


    public nextTask(platform:Platforms):Task
    {
        let pending_tasks = this.tasks.filter((t:Task) => 
            t.status == TaskStatus.NONE &&
            t.platform == platform);
        if (pending_tasks.length > 0)
        {
            return pending_tasks[0];
        }
        return null;
    };

    public hasTask(task:Task)
    {
        let index = this.tasks.findIndex((t) => t.id == task.id);
        return index != -1; 
    };

    public addResult(result:TestCaseResults)
    {
        let index = this.tasks.findIndex((t) => t.id == result.task.id);
        if (index != -1)
        {
            
            result.task = this.tasks[index];
            result.populateSkipped();
            console.log("Result for " + result.task.test.name);
            if (result.skipped.length == 0 && result.failed.length == 0)
            {
                result.task.status = TaskStatus.PASSED;
            } else {
                result.task.status = TaskStatus.FAILED;
            }
            this.results.push(result);
        }
    };

    public isFinished(): boolean
    {
        this.finished = this.tasks.filter((t:Task) => 
            t.status == TaskStatus.NONE ||
            t.status == TaskStatus.RUNNING ||
            t.status == TaskStatus.PENDING).length == 0;
        
        return this.finished;
    };

    public process()
    {
        // Noop
    };
};
