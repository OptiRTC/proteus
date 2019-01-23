import {Platforms} from "platforms";
import {TestComponent} from "testcomponents";
import {UniqueID} from "uniqueid";
import { MessageTransport, Message } from "messagetransport";
import { Partitions, TaskChannels } from "protocol";
import { Result, TestStatus, TestCases } from "result";

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

    public abort(transport:MessageTransport)
    {
        let results = [];
        for (let expected of this.test.expectations)
        {
            results.push(new Result(
                expected,
                this.test.binary,
                TestStatus.FAILED,
                1,
                new Date().getTime(),
                [ "test aborted" ]));
        }
        transport.sendMessage(new Message(
            Partitions.TASKS,
            TaskChannels.RESULT,
            this.id,
            new TestCases(
                'N/A',
                [],
                results,
                this)));
    };
};
