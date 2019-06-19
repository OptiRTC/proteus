import {Platforms} from "common/platforms";
import {TestComponent} from "common/testcomponents";
import {UniqueID} from "common/uniqueid";
import { MessageTransport, Transportable } from "common/messagetransport";
import { Partitions, TaskChannels } from "common/protocol";
import { Result, TestStatus, TestCaseResults } from "common/result";

export enum TaskStatus
{
    NONE = "None",
    PENDING = "Pending",
    RUNNING = "Running",
    PASSED = "Passed",
    FAILED = "Failed",
    IGNORED = "Ignored",
    SKIPPED = "Skipped",
    INCONCLUSIVE = "Inconclusive",
    NOTFOUND = "NotFound",
    CANCELLED = "Cancelled",
    NOTRUNNABLE = "NotRunable"
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
    public error_count:number;

    constructor(content?:any)
    {
        super();
        this.status = TaskStatus.NONE;
        this.error_count = 0;
        if (content)
        {
            this.fromJSON(content);
        } else {
            this.started = 0;
            this.timestamp = new Date().getTime();
        }
    };

    public abort(transport:MessageTransport)
    {
        this.status = TaskStatus.CANCELLED;
        let results = [];
        for (let expected of this.test.expectations)
        {
            let abort_res = new Result();
            abort_res.name = expected;
            abort_res.classname = this.test.scenario;
            abort_res.status = TestStatus.FAILED;
            abort_res.assertions = 1;
            abort_res.finished = new Date().getTime();
            abort_res.messages = [ "Test ABORTED" ];
            results.push(abort_res);
        }
        transport.sendMessage(
            Partitions.TASKS,
            TaskChannels.ABORT,
            this.id,
            null);
        transport.sendMessage(
            Partitions.TASKS,
            TaskChannels.RESULT,
            this.id,
            new TestCaseResults({
                worker_id: 'N/A',
                passed: [],
                failed: results,
                task: this}).toJSON());
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
            error_count: this.error_count,
            test: this.test.toJSON()
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
        this.error_count = typeof(content.timestamp) == 'undefined' ? 0 : content.error_count;
        return this;
    };
};
