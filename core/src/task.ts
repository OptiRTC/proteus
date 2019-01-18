import {Platforms, PlatformsName} from "./platforms";
import {TestComponent} from "./testcomponents";
import {UniqueID} from "./uniqueid";

export class Task extends UniqueID
{
    constructor(
        public job_id:string,
        public worker_id:string,
        public platform:Platforms,
        public pool_id:string,
        public storage_id:string,
        public test:TestComponent)
    {
        super();
    };
};
