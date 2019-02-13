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
            get("Worker.timeout"));
        this.task = null;
        this.local_storage = null;
        this.transport.subscribe(this, Partitions.SYSTEM, SystemChannels.START, null);
        this.config_interval = setInterval(() => this.sendDiscovery(), 15000);
        this.abort = null;
        setInterval(() => this.sendHeartbeat(), parseInt(get('Worker.heartbeat')) * 1000);
    };

    public onMessage(message:Message)
    {
       switch(message.channel)
        {      
            case WorkerChannels.QUERY:
                this.sendStatus();
                break;
            case WorkerChannels.TASK:
                console.log("Starting Task", message.content);
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
                    .catch((e) => console.log(e))
                    .finally(() => this.resetState());
                break;
            case WorkerChannels.CONFIG:
                console.log("Discovery Finished");
                this.pool_id = (message.content["pool_id"] || this.pool_id);
                clearInterval(this.config_interval);
                this.config_interval = null;
                break;
            case SystemChannels.START:
                // Generally indicates a Core reboot
                if (this.abort != null)
                {
                    this.abort();
                }
                this.sendDiscovery();
                break;
            default:
                break;
        }
    };

    public resetState()
    {
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
            {state: this.state});
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
            this.abort = () => reject("Aborted Run");
            let rejectTimeout = setTimeout(() => reject("Test Timed out (" + this.timeout + ")"), this.timeout);
            if (test.scenario != null)
            {
                // Scenarios are a promise chain
                try {
                    let scenario_file = relative(__dirname, this.local_storage.path + "/" + test.scenario);
                    let scenario = require(scenario_file).scenario;
                    scenario.run(test.metadata).then((results) => {
                        results = results.map((item) => new Result(item));
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            passing: results.filter((r) => r.status == TestStatus.PASSING),
                            failed: results.filter((r) => r.status == TestStatus.FAILED)
                        }));
                    }).catch((e) => {
                        console.log(e);
                        resolve(new TestCaseResults({
                            worker_id: get('Worker.id'),
                            timestamp: new Date().getTime(),
                            failed: [new Result({
                                name: test.scenario,
                                classname: test.scenario,
                                status: TestStatus.FAILED,
                                messages: [e]})
                            ]
                        }));
                    }).finally(() => {
                        clearTimeout(rejectTimeout);
                        this.resetState();
                    });
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            } else {
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
                reject();
                return;
            }
            let storeUrl = "http://" + get('Core.FileServer') + ":" + get('Core.FilePort') + "/" + this.task.storage_id;
            this.local_storage = new Storage();
            try {
                request(storeUrl, {encoding: 'binary'}, (err, res, body) => {
                    if (err != null ||
                        res.statusCode != 200)
                    {
                        reject("Failed to contact File Server");
                        return;
                    }
                    try {
                        let targetFile = '/tmp/artifacts.zip';
                        fs.writeFileSync(targetFile, body, 'binary');
                        let zip = new AdmZip(targetFile);
                        zip.extractAllTo(this.local_storage.path, true);
                    } catch(e) {
                        console.log(e);
                        reject("Error extracting artifacts");
                        return;
                    }
                    resolve();
                });
            } catch(e) {
                reject(e);
            }
        });
    };
};
