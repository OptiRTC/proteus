import {Task} from "common:task";
import {UniqueID} from "common:uniqueid";
import { Transportable, ArrayFromJSON, ArrayToJSON } from "common:messagetransport";

export enum TestStatus
{
    PASSING = "passing",
    FAILED = "failed",
    SKIPPED = "skipped"
};

export class Result implements Transportable
{
    public name:string;
    public classname:string;
    public status:TestStatus;
    public assertions:number;
    public finished:number;
    public messages:string[]

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
            finished: this.finished,
            messages: this.messages
        };
    };

    public fromJSON(content:any): Result
    {
        this.name = content.name;
        this.classname = content.classname;
        this.status = <TestStatus> content.status;
        this.assertions = content.assertions;
        this.finished = content.finished;
        this.messages = content.messages;
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
            this.failed =[];
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
            res.classname = res.name = name;
            res.status = TestStatus.SKIPPED;
            res.assertions = 0;
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
            this.skipped = ArrayFromJSON<Result>(Result, content.skipped);
        }
        this.timestamp = content.timestamp;
        return this;
    };
};
