import { Adapter } from "core/adapter";
import { createLogger } from "logzio-nodejs";
import { TestCaseResults, Result } from "common/result";
import { ProteusCore } from "core/proteuscore";
import { get } from "config";
import { Task, TaskStatus } from "common/task";

export class LogzioAdapter extends Adapter
{
    /* tslint:disable:no-unused-variable */
    protected logger:any;

    constructor(parent:ProteusCore)
    {
        super("Logzio", parent);
        this.logger = createLogger({
            "token": get("Logz.Token"),
            "type": "proteus",
            "protocol": "https"
        });
    };

    public getBuild():string
    {
        // Look for metadata.json
        return "local_build";
    };

    public handleResults(results:TestCaseResults[])
    {
        let task = new Task(results[0].task.toJSON());
        task.status = TaskStatus.PASSED;
        let passing = 0;
        let skipped = 0;
        let failed = 0;
        let logitem = (item:Result, result:TestCaseResults) => {
            let payload = {
                // Keys
                "message": "Test Result",
                "result": result.id,
                "build": result.task.build,
                "job": result.task.job_id,
                "platform": result.task.platform,
                "pool": result.task.pool_id,
                "@timestamp": item.started,
                "test": item.name,
                "scenario": item.classname,
                "worker": result.task.worker_id,
                "status": item.status,
                // Data
                "started": item.started,
                "finished": item.finished,
                "output": item.messages,
                "assertions": item.assertions
            };
            this.logger.log(payload);
        };
        for (let result of results)
        {

            this.logger.log({
                // Keys
                "message": "Test Summary",
                "result": result.id,
                "build": result.task.build,
                "job": result.task.job_id,
                "platform": result.task.platform,
                "pool": result.task.pool_id,
                "@timestamp": result.timestamp,
                "test": result.task.test.name,
                "scenario": result.task.test.scenario,
                "worker": result.worker_id,
                "status": result.task.status,
                // Data
                "passing_count": result.passing.length,
                "skipped_count": result.skipped.length,
                "failed_count": result.failed.length,
                "storage": result.task.storage_id
            });
            // Flatten out the result
            for(let item of result.passing)
            {
                logitem(item, result);
            }

            for(let item of result.skipped)
            {
                logitem(item, result);
            }

            for(let item of result.failed)
            {
                logitem(item, result);
            }
            if (failed > 0)
            {
                task.status = TaskStatus.FAILED;
            } else {
                if (skipped > 0)
                {
                    task.status = TaskStatus.INCONCLUSIVE;
                }
            }
        };
        this.logger.log({
            // Keys
            "message": "Proteus Job Summary",
            "build": task.build,
            "job": task.job_id,
            "platform": task.platform,
            "pool": task.pool_id,
            "@timestamp": new Date().getTime(),
            "finished": new Date().getTime(),
            "started": task.started,
            "status": task.status,
            "passing": passing,
            "skipped": skipped,
            "failed": failed
        });
    };
};
