import { UniqueID } from "uniqueid";
export var TestStatus;
(function (TestStatus) {
    TestStatus["PASSING"] = "passing";
    TestStatus["FAILED"] = "failed";
    TestStatus["SKIPPED"] = "skipped";
})(TestStatus || (TestStatus = {}));
;
export class Result {
    constructor(name, classname, status, assertions, finished, messages) {
        this.name = name;
        this.classname = classname;
        this.status = status;
        this.assertions = assertions;
        this.finished = finished;
        this.messages = messages;
    }
}
;
export class TestCases extends UniqueID {
    constructor(worker_id, passing, failed, task) {
        super();
        this.worker_id = worker_id;
        this.passing = passing;
        this.failed = failed;
        this.task = task;
        let run;
        run.concat(this.passing);
        run.concat(this.failed);
        this.skipped = [];
        for (let name of task.test.getSkipped(run)) {
            this.skipped.push(new Result(name, name, TestStatus.SKIPPED, 0, new Date().getTime(), []));
        }
        this.timestamp = new Date().getTime();
    }
    ;
}
;
//# sourceMappingURL=result.js.map