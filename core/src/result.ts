import {Task} from "./task";
import {UniqueID} from "./uniqueid";

export class Result extends UniqueID
{
    public skipped:string[];
    constructor(
        public passing:string[],
        public failed:string[],
        public task:Task)
    {
        super();
        let run: string[];
        run.concat(this.passing);
        run.concat(this.failed);
        this.skipped = task.test.getSkipped(run);
    };


};
