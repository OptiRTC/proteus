import { Platforms } from "common/platforms";
import { TestComponent } from "common/testcomponents";
import { UniqueID } from "common/uniqueid";
import { Transportable } from "common/messagetransport";

export enum TaskStatus
{
    NONE = "None",
    RUNNING = "Running",
    PASSED = "Passed",
    FAILED = "Failed",
    IGNORED = "Ignored",
    SKIPPED = "Skipped",
    INCONCLUSIVE = "Inconclusive",
    NOTFOUND = "NotFound",
    CANCELLED = "Cancelled",
    NOTRUNNABLE = "NotRunable",
    PENDING = "Pending"
};

export class Task extends UniqueID implements Transportable
{
    public build:string;
    public job_id:string;
    public worker_id:string;
    public platform:Platforms;
    public pool_id:string;
    public storage_id:string;
    public test:TestComponent;
    public timestamp:number;
    public started:number;
    public status:TaskStatus;

    constructor(content?:any)
    {
        super();
        this.status = TaskStatus.NONE;
        if (content)
        {
            this.fromJSON(content);
        } else {
            this.started = 0;
            this.timestamp = new Date().getTime();
        }
    };

    public toJSON():any
    {
        return {
            id: this.id,
            build: this.build,
            job_id: this.job_id,
            worker_id: this.worker_id,
            platform: this.platform,
            pool_id: this.pool_id,
            storage_id: this.storage_id,
            started: this.started,
            timestamp: this.timestamp,
            test: this.test != null ? this.test.toJSON() : null
        };
    };

    public fromJSON(content:any): Task
    {
        if (typeof(content.id) != 'undefined')
        {
            this.id = content.id;
        }
        this.test = new TestComponent(content.test);
        this.build = typeof(content.build) == 'undefined' ? "NAMEERROR" : content.build;
        this.job_id = typeof(content.job_id) == 'undefined' ? null : content.job_id;
        this.worker_id = typeof(content.worker_id) == 'undefined' ? null : content.worker_id;
        this.platform = content.platform in Platforms ? "NAMEERROR" : content.platform;
        this.pool_id = typeof(content.pool_id) == 'undefined' ? null : content.pool_id;
        this.storage_id = typeof(content.storage_id) == 'undefined' ? null : content.storage_id;
        this.started = typeof(content.started) == 'undefined' ? null : content.started;
        this.timestamp = typeof(content.timestamp) == 'undefined' ? new Date().getTime() : content.timestamp;
        return this;
    };
};
