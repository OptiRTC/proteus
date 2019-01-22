import {Platforms} from "platforms";
import {TestComponent} from "testcomponents";
import {UniqueID} from "uniqueid";

export class Task extends UniqueID
{
    public timestamp:number;
    public started:number;
    constructor(
        public build:string,
        public job_id:string,
        public worker_id:string,
        public platform:Platforms,
        public pool_id:string,
        public storage_id:string,
        public test:TestComponent)
    {
        super();
        this.timestamp = new Date().getTime();
    };
};
