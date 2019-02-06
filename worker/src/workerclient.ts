import { WorkerState, Worker } from 'common/worker';
import { Message, MessageTransport } from 'common/messagetransport';
import { WorkerChannels, TaskChannels, Partitions } from 'common/protocol';
import { get } from 'config';
import { TestComponent } from 'common/testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { Task } from 'common/task';
import { Storage } from 'common/storage';
import { resolve as abspath}  from 'path';
import request from 'request';
import AdmZip from 'adm-zip';
import fs from 'fs';

export class WorkerClient extends Worker
{
    public storage_id:string;
    public local_storage:Storage;
    public task:Task;

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
                this.state = WorkerState.BUSY;
                this.sendStatus();
                let res:TestCaseResults = null;
                this.task = new Task(message.content);
                this.fetchArtifacts()
                    .then(() => this.runTest(this.task.test))
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
                        this.transport.sendMessage(
                            Partitions.TASKS,
                            TaskChannels.RESULT,
                            this.id,
                            res.toJSON());
                        this.state = WorkerState.IDLE;
                        this.sendStatus();
                    });
                break;
            case WorkerChannels.CONFIG:
                break;
            default:
                break;
        }
    };

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
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            let rejectTimeout = setTimeout(() => reject("Test Timed out (" + this.timeout + ")"), this.timeout);
            if (test.scenario != null)
            {
                // Scenarios are a promise chain
                let scenario = require(abspath(this.local_storage.path + "/" + test.scenario));
                console.log(scenario);
                scenario.run().then(() => {
                    resolve(new TestCaseResults({
                        worker_id: get('Worker.id'),
                        timestamp: new Date().getTime(),
                        passing: [new Result({
                            name: test.scenario,
                            classname: test.scenario,
                            status: TestStatus.PASSING})
                        ]
                    }));
                }).catch((e) => {
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
                });
            } else {
                reject("Scenario not found");
            }
        });
    };

    public fetchArtifacts(): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
            if (this.storage_id == null)
            {
                reject();
                return;
            }
            let storeUrl = "http://" + get('Core.FileServer') + "/" + this.storage_id;
            this.local_storage = new Storage();
            request(storeUrl, {encoding: 'binary'}, (err, res, body) => {
                if (err != null ||
                    res.statusCode != 200)
                {
                    reject();
                    return;
                }
                let targetFile = '/tmp/artifacts.zip';
                fs.writeFileSync(targetFile, body, 'binary');
                let zip = new AdmZip(targetFile);
                zip.extractAllTo(this.local_storage.path, true);
                resolve();
            });
        });
    };
};
