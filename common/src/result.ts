import {Task} from "common/task";
import {UniqueID} from "common/uniqueid";
import { Transportable, ArrayFromJSON, ArrayToJSON } from "common/messagetransport";

export enum TestStatus
{
    PASSING = "passing",
    FAILED = "failed",
    SKIPPED = "skipped"
};

export class Result implements Transportable
{
    // A result needs to be fully serializable for transmission between
    // workers and core
    public name:string;
    public classname:string;
    public status:TestStatus;
    public assertions:number;
    public started:number;
    public finished:number;
    public messages:string[];

    constructor(content?:any)
    {
        if (content)
        {
            this.fromJSON(content);
        }
    }

    public toJSON():any
    {
        return {
            name: this.name,
            classname: this.classname,
            status: this.status,
            assertions: this.assertions,
            started: this.started,
            finished: this.finished,
            messages: this.messages
        };
    };

    public fromJSON(content:any): Result
    {
        this.name = content.name || "Unknown name";
        this.classname = content.classname || "Unknown class";
        this.status = <TestStatus> content.status || TestStatus.SKIPPED;
        this.assertions = content.assertions || 1;
        this.started = content.started || new Date().getTime();
        this.finished = content.finished || new Date().getTime();
        this.messages = content.messages || [];
        return this;
    };
};

export class TestCaseResults extends UniqueID implements Transportable
{
    public skipped:Result[];
    public timestamp:number;
    public worker_id:string;
    public passing:Result[];
    public failed:Result[];
    public task:Task;

    constructor(content?:any)
    {
        super();
        if (content)
        {
            this.fromJSON(content);
        } else {
            this.passing = [];
            this.failed = [];
            this.timestamp = new Date().getTime();
        }
    };

    public populateSkipped()
    {
        let run = [];
        run = run.concat(this.passing);
        run = run.concat(this.failed);
        this.skipped = [];
        if (this.task == null)
        {
            return;
        }
        let skipped_names = this.task.test.getSkipped(run);
        for(let name of skipped_names)
        {
            let res = new Result();
            res.name = name;
            res.classname = this.task.test.scenario;
            res.status = TestStatus.SKIPPED;
            res.assertions = 0;
            res.started = this.task.started;
            res.finished = new Date().getTime();
            res.messages = [];
            this.skipped.push(res);
        }
    }

    public toJSON():any
    {
        return {
                id: this.id,
                worker_id: this.worker_id,
                passing: ArrayToJSON(this.passing),
                failed: ArrayToJSON(this.failed),
                skipped: ArrayToJSON(this.skipped),
                timestamp: this.timestamp,
                task: this.task.toJSON()
            };
    };

    public fromJSON(content:any): TestCaseResults
    {
        if (typeof(content.id != 'undefined'))
        {
            this.id = content.id;
        }
        this.task = typeof(content.task) == 'undefined' ? null : new Task(content.task);
        this.worker_id = typeof(content.worker_id) == 'undefined' ? null : content.worker_id;
        this.passing = typeof(content.passing) == 'undefined' ? [] : ArrayFromJSON<Result>(Result, content.passing);
        this.failed = typeof(content.failed) == 'undefined' ? [] : ArrayFromJSON<Result>(Result, content.failed);
        if (typeof(content.skipped) == 'undefined')
        {
            this.populateSkipped();
        } else {
            this.skipped = typeof(content.skipped) == 'undefined' ? [] : ArrayFromJSON<Result>(Result, content.skipped);
        }
        this.timestamp = typeof(content.timestamp) == 'undefined' ? new Date().getTime() : parseInt(content.timestamp);
        return this;
    };
};
