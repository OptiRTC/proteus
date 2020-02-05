import { WorkerState, Worker } from 'common/worker';
import { Message, MessageTransport } from 'common/messagetransport';
import { WorkerChannels, TaskChannels, Partitions, SystemChannels } from 'common/protocol';
import { get } from 'config';
import { TestComponent } from 'common/testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { Task } from 'common/task';
import { ProteusStorage } from 'common/storage';
import { relative }  from 'path';
import request from 'request';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { execSync } from 'child_process';
declare const __non_webpack_require__:any;

export class WorkerClient extends Worker
{
    public local_storage:ProteusStorage;
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
            parseInt(get("Worker.timeout")));
        this.task = null;
        this.local_storage = new ProteusStorage();;
        this.transport.subscribe(this, Partitions.SYSTEM, SystemChannels.START, null);
        this.transport.subscribe(this, Partitions.WORKERS, null, this.id);
        this.config_interval = setInterval(() => this.sendDiscovery(), 15000);
        this.abort = null;
        this.state = WorkerState.IDLE;
        setInterval(() => this.sendStatus(), parseInt(get('Worker.heartbeat')) * 1000);
    };

    public onMessage(message:Message)
    {
       switch(message.channel)
        {
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
                this.updateState(WorkerState.BUSY);
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
                            console.log("Caught Error: ", e);
                            res = new TestCaseResults({
                                worker_id: get('Worker.id'),
                                timestamp: new Date().getTime(),
                                task: this.task,
                                failed: [new Result({
                                    name: message.content.name,
                                    classname: message.content.name,
                                    status: TestStatus.FAILED,
                                    messages: [e]})
                                ]
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
                        console.log("Error Caught:", e);
                        this.state = WorkerState.ERROR;
                    })
                    .finally(() => {
                        if (this.state != WorkerState.ERROR)
                        {
                            this.resetState();
                            this.sendStatus();
                        }
                        console.log("Finished");
                    });
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
                console.log("Start!");
                if (this.abort != null)
                {
                    this.abort();
                }
                this.resetState();
                this.config_interval = setInterval(() => this.sendDiscovery(), 15000);
                break;
            default:
                break;
        }
    };

    public resetState()
    {
        console.log("Worker Idle");
        this.abort = null;
        this.task = null;
        this.updateState(WorkerState.IDLE);
        this.sendStatus();
    }

    public sendDiscovery()
    {
        let discoveryPayload = {id: this.id, pool: this.pool_id, platform: this.platform, state: this.state};
        console.log(`Starting Discovery ${JSON.stringify(discoveryPayload, null, 2)}`);
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.DISCOVER,
            this.id,
            discoveryPayload);
    }

    protected updateState(state:WorkerState)
    {
        super.updateState(state);
        switch(this.state)
        {
            case WorkerState.IDLE:
                // Remove any trigger and turn LED OFF
                execSync('sudo sh -c "echo none >/sys/class/leds/led0/trigger"', {stdio: 'pipe'});
                execSync('sudo sh -c "echo 0 >/sys/class/leds/led0/brightness"', {stdio: 'pipe'});
                break;
            case WorkerState.BUSY:
                // Remove any trigger and turn LED ON
                execSync('sudo sh -c "echo none >/sys/class/leds/led0/trigger"',{stdio: 'pipe'});
                execSync('sudo sh -c "echo 1 >/sys/class/leds/led0/brightness"',{stdio: 'pipe'});
                break;
            default:
                // Set heartbeat trigger
                execSync('sudo sh -c "echo heartbeat >/sys/class/leds/led0/trigger"',{stdio: 'pipe'});
                break;
        }
    }

    public sendStatus()
    {

        let testname = "";
        let scenarioname = "";
        if (this.task !== null)
        {
            testname = this.task.test.name;
            scenarioname = this.task.test.scenario;
        }
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.STATUS,
            this.id,
            {state: this.state, test: testname, scenario: scenarioname});
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
            }, this.timeout * 1000);
            if (test.scenario != null)
            {
                // Scenarios are a promise chain
                try {
                    let scenario_file = relative(__dirname, this.local_storage.path + "/" + test.scenario);
                    let scenarioClass = null;
                    if (typeof __non_webpack_require__ != "undefined")
                    {
                        delete __non_webpack_require__.cache[__non_webpack_require__.resolve(scenario_file)];
                        scenarioClass = __non_webpack_require__(scenario_file).scenario;
                    } else {
                        delete require.cache[require.resolve(scenario_file)];
                        scenarioClass = require(scenario_file).scenario;
                    }
                    let scenario = new scenarioClass();
                    scenario.run(test.metadata)
                    .then((results) => {
                        console.log("Scenario Complete");
                        results = results.map((item) => new Result(item));
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            passing: results.filter((r) => r.status == TestStatus.PASSING),
                            failed: results.filter((r) => r.status == TestStatus.FAILED)
                        }));
                    }).catch((e) => {
                        console.log("Scenario Error " + e);
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            failed: test.expectations.map((item) => {
                                return new Result({
                                    name: item,
                                    classname: test.scenario,
                                    started: new Date().getTime(),
                                    finished: new Date().getTime(),
                                    status: TestStatus.FAILED,
                                    messages: [e]}).toJSON();
                                })
                        }));
                    }).finally(() => {
                        console.log("Cleanup Scenario");
                        clearTimeout(rejectTimeout);
                    });
                } catch (e) {
                    clearTimeout(rejectTimeout);
                    reject("Error loading scenario: " + e);
                }
            } else {
                clearTimeout(rejectTimeout);
                reject("Scenario not found");
            }
        });
    };

    public fetchArtifacts(): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            this.abort = () => reject("Aborted fetch");
            if (this.task.storage_id == null)
            {
                reject("No storage specified");
                return;
            }
            let storeUrl = "http://" + get('Core.FileServer') + ":" + get('Core.FilePort') + "/" + this.task.storage_id;
            try {
                request(storeUrl, {encoding: 'binary'}, (err, res, body) => {
                    if (err != null ||
                        res.statusCode != 200)
                    {
                        reject("Request failed " + err);
                        if (body)
                        {
                            console.log("Body: " + body);
                        }
                        return;
                    }
                    try {
                        let targetFile = '/tmp/artifacts.zip';
                        fs.writeFileSync(targetFile, body, 'binary');
                        let zip = new AdmZip(targetFile);
                        zip.extractAllTo(this.local_storage.path, true);
                    } catch(e) {
                        reject("Error extracting artifacts " + e);
                        return;
                    }
                    resolve();
                });
            } catch(e) {
                reject("Error fetching artifacts " + e);
            }
        });
    };

    public checkHeartbeat()
    {
        // Noop/override
    };
};
