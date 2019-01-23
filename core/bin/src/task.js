import { UniqueID } from "uniqueid";
import { Message } from "messagetransport";
import { Partitions, TaskChannels } from "protocol";
import { Result, TestStatus, TestCases } from "result";
export class Task extends UniqueID {
    constructor(build, job_id, worker_id, platform, pool_id, storage_id, test) {
        super();
        this.build = build;
        this.job_id = job_id;
        this.worker_id = worker_id;
        this.platform = platform;
        this.pool_id = pool_id;
        this.storage_id = storage_id;
        this.test = test;
        this.timestamp = new Date().getTime();
    }
    ;
    abort(transport) {
        let results = [];
        for (let expected of this.test.expectations) {
            results.push(new Result(expected, this.test.binary, TestStatus.FAILED, 1, new Date().getTime(), ["test aborted"]));
        }
        transport.sendMessage(new Message(Partitions.TASKS, TaskChannels.RESULT, this.id, new TestCases('N/A', [], results, this)));
    }
    ;
}
;
//# sourceMappingURL=task.js.map