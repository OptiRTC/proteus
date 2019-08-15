import { WorkerState, Worker } from 'common/worker';
import { Message, MessageTransport } from 'common/messagetransport';
import { WorkerChannels, TaskChannels, Partitions, SystemChannels } from 'common/protocol';
import { get } from 'config';
import { TestComponent } from 'common/testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { Task } from 'common/task';
import { Storage } from 'common/storage';
import { relative }  from 'path';
import request from 'request';
import AdmZip from 'adm-zip';
import fs from 'fs';
declare const __non_webpack_require__:any;

export class WorkerClient extends Worker
{
    public local_storage:Storage;
    public task:Task;
    public config_interval:NodeJS.Timeout;
    public abort:any;

    constructor(transport:MessageTransport)
    {
        super(
            get("Worker.id"),
            get("Worker.pool"),
            get("Worker.platform"),
            transport,
            parseInt(get("Worker.timeout")) * 1000);
        this.task = null;
        this.local_storage = new Storage();;
        this.transport.subscribe(this, Partitions.SYSTEM, SystemChannels.START, null);
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.QUERY, null);
        this.config_interval = setInterval(() => this.sendDiscovery(), 15000);
        this.abort = null;
        this.state = WorkerState.IDLE;
        setInterval(() => this.sendHeartbeat(), parseInt(get('Worker.heartbeat')) * 1000);
    };

    public onMessage(message:Message)
    {
       switch(message.channel)
        {
            case WorkerChannels.QUERY:
                if (message.content.pool_id == this.pool_id)
                {
                    this.sendStatus();
                }
                break;
            case WorkerChannels.TASK:
                if (this.state != WorkerState.IDLE)
                {
                    this.transport.sendMessage(
                        Partitions.WORKERS,
                        WorkerChannels.REJECT,
                        this.id,
                        {task_id: message.content.id});
                    return;
                }
                this.transport.sendMessage(
                    Partitions.WORKERS,
                    WorkerChannels.ACCEPT,
                    this.id,
                    {task_id: message.content.id});
                console.log("Starting Task", message.content.id);
                this.state = WorkerState.BUSY;
                this.sendStatus();
                let res:TestCaseResults = null;
                this.task = new Task(message.content);
                this.fetchArtifacts()
                    .then(() => this.runTest(this.task.test)
                        .then((result:TestCaseResults) =>
                        {
                            res = result;
                            res.worker_id = get('Worker.id');
                            res.timestamp = new Date().getTime();
                            res.task = this.task;
                            res.populateSkipped();
                        }).catch((e) => {
                            console.log(e);
                            res = new TestCaseResults({
                                worker_id: get('Worker.id'),
                                timestamp: new Date().getTime(),
                                task: this.task,
                                failed: this.task.test.expectations.map((item) => {
                                    new Result({
                                        name: item,
                                        classname: this.task.test.scenario,
                                        started: new Date().getTime(),
                                        finished: new Date().getTime(),
                                        status: TestStatus.FAILED,
                                        messages: [e]})
                                    })
                            });
                        }).finally(() => {
                            console.log("Task Finished", this.task.id);
                            this.transport.sendMessage(
                                Partitions.TASKS,
                                TaskChannels.RESULT,
                                this.task.id,
                                res.toJSON());
                        }))
                    .catch((e) => {
                        console.log(e);
                    })
                    .finally(() => setTimeout(() => this.resetState(), 5000));
                break;
            case WorkerChannels.CONFIG:
                console.log("Discovery Finished");
                this.pool_id = (message.content["pool_id"] || this.pool_id);
                clearInterval(this.config_interval);
                this.config_interval = null;
                break;
            case WorkerChannels.ABORT:
                if (this.abort != null)
                {
                    this.abort();
                }
                this.resetState();
                break;
            case SystemChannels.START:
                // Generally indicates a Core reboot
                if (this.abort != null)
                {
                    this.abort();
                }
                this.resetState();
                this.sendDiscovery();
                break;
            default:
                break;
        }
    };

    public resetState()
    {
        console.log("Worker Idle");
        this.abort = null;
        this.state = WorkerState.IDLE;
        this.sendStatus();
    }

    public sendDiscovery()
    {
        console.log("Starting Discovery");
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.DISCOVER,
            this.id,
            {pool: this.pool_id, platform: this.platform, state: this.state});
    }

    public sendStatus()
    {
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.STATUS,
            this.id,
            {
                state: this.state,
                task_name: this.task.test.name
            });
    };

    public sendHeartbeat()
    {
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.HEARTBEAT,
            this.id,
            null);
    };

    public runTest(test:TestComponent):Promise<TestCaseResults> {
        console.log("Running Test");
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            this.abort = () => {
                reject("Aborted Run");
            };
            let rejectTimeout = setTimeout(() => {
                reject("Test Timed out (" + this.timeout + ")");
            }, this.timeout);
            if (test.scenario != null)
            {
                // Scenarios are a promise chain
                try {
                    let scenario_file = relative(__dirname, this.local_storage.path + "/" + test.scenario);
                    let scenario = null;
                    console.log("Loading scenario " + scenario_file);
                    if (typeof __non_webpack_require__ != "undefined")
                    {
                        delete __non_webpack_require__.cache[__non_webpack_require__.resolve(scenario_file)];
                        scenario = __non_webpack_require__(scenario_file).scenario;
                    } else {
                        delete require.cache[require.resolve(scenario_file)];
                        scenario = require(scenario_file).scenario;
                    }
                    console.log("Starting test" + test.name);
                    console.log(JSON.stringify(test.metadata));
                    scenario.run(test.metadata)
                    .then((results) => {
                        console.log("Test Finished Successfully");
                        results = results.map((item) => new Result(item));
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            passing: results.filter((r) => r.status == TestStatus.PASSING),
                            failed: results.filter((r) => r.status == TestStatus.FAILED)
                        }));
                    }).catch((e) => {
                        console.log("Test Error");
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            failed: test.expectations.map((item) => {
                                new Result({
                                    name: item,
                                    classname: test.scenario,
                                    started: new Date().getTime(),
                                    finished: new Date().getTime(),
                                    status: TestStatus.FAILED,
                                    messages: [e]})
                                })
                        }));
                    }).finally(() => {
                        clearTimeout(rejectTimeout);
                    });
                } catch (e) {
                    console.log("Uncaught Error " + e);
                    reject(e);
                }
            } else {
                reject("Not sure how to execute " + JSON.stringify(test));
            }
        });
    };

    public fetchArtifacts(): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            this.abort = () => reject("Aborted fetch");
            if (this.task.storage_id == null)
            {
                reject();
                return;
            }
            let storeUrl = "http://" + get('Core.FileServer') + ":" + get('Core.FilePort') + "/" + this.task.storage_id;
            try {
                request(storeUrl, {encoding: 'binary'}, (err, res, body) => {
                    if (err != null ||
                        res.statusCode != 200)
                    {
                        console.log("File Sync Error");
                        reject(err);
                        return;
                    }
                    try {
                        let targetFile = '/tmp/artifacts.zip';
                        fs.writeFileSync(targetFile, body, 'binary');
                        let zip = new AdmZip(targetFile);
                        zip.extractAllTo(this.local_storage.path, true);
                    } catch(e) {
                        console.log("UnZip/Extract Failure");
                        reject(e);
                        return;
                    }
                    resolve();
                });
            } catch(e) {
                console.log("Fetch Error");
                reject(e);
            }
        });
    };
};
