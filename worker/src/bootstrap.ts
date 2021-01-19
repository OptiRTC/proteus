import { TaskChannels } from 'common/protocol';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { get } from 'config';
import { exit } from 'process';

declare const __non_webpack_require__:any;

//let alive:Boolean = true;
let test = null;
let scenario_file = null;

function sendError(e)
{
    process.send({
        type:  TaskChannels.RESULT,
        results: new TestCaseResults({
            worker_id: get('Worker.id'),
            timestamp: new Date().getTime(),
            failed: test.expectations.map((item) => {
                return new Result({
                    name: item,
                    classname: test.scenario,
                    started: new Date().getTime(),
                    finished: new Date().getTime(),
                    status: TestStatus.FAILED,
                    messages: [e]
                })
            })
        }).toJSON()
    });
}

function sendResults(results)
{
    results = results.map((item) => {
        return new Result(item);
    });
    process.send({
        type: "result",
        results: new TestCaseResults({
            worker_id: get('Worker.id'),
            timestamp: new Date().getTime(),
            passing: results.filter((r) => r.status == TestStatus.PASSING),
            failed: results.filter((r) => r.status == TestStatus.FAILED)
        }).toJSON()
    });
}

process.on('unhandledRejection', (reason, p) => {
    let msg = `Unhandled Rejection at: Promise ${p}, reason: ${reason}`;
    console.log(msg);
    sendError(msg);
});

process.on('message', (packet:any) => {
    test = packet.test;
    scenario_file = packet.scenario;
    console.log(`Subprocess Bootstrap Loading ${scenario_file}`);
    let scenario = null;
    if (typeof __non_webpack_require__ != "undefined")
    {
        delete __non_webpack_require__.cache[__non_webpack_require__.resolve(scenario_file)];
        scenario = new (__non_webpack_require__(scenario_file).scenario)();
    } else {
        delete require.cache[require.resolve(scenario_file)];
        scenario = new (require(scenario_file).scenario)();
    }
    try {
        scenario.run(test.metadata)
        .then((results) => { 
            sendResults(results)
        }).catch((e) => {
            sendError(e);
        }).finally(() => {
            exit(0);
        });
    } catch(e) {
        console.log(`Uncaught error: ${e}`);
    }
});
