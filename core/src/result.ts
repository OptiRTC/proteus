import {Task} from "task";
import {UniqueID} from "uniqueid";

export enum TestStatus
{
    PASSING = "passing",
    FAILED = "failed",
    SKIPPED = "skipped"
};

export class Result
{
    constructor(
        public name:string,
        public classname:string,
        public status:TestStatus,
        public assertions:number,
        public finished:number,
        public messages:string[]) {}
};

export class TestCases extends UniqueID
{
    public skipped:Result[];
    public timestamp:number;
    constructor(
        public worker_id:string,
        public passing:Result[],
        public failed:Result[],
        public task:Task)
    {
        super();
        let run: Result[];
        run.concat(this.passing);
        run.concat(this.failed);
        this.skipped = [];
        for(let name of task.test.getSkipped(run))
        {
            this.skipped.push(new Result(name, name, TestStatus.SKIPPED, 0, new Date().getTime(), []));
        }
        this.timestamp = new Date().getTime();
    };
};
