import { WorkerState, Worker } from 'common:worker';
import { Device } from 'worker:device';
import { ParticleDevice } from 'worker:particledevice';
import { Message, MessageTransport } from 'common:messagetransport';
import { Platforms } from 'common:platforms';
import { WorkerChannels, TaskChannels, Partitions } from 'common:protocol';
import { get } from 'config';
import { TestComponent } from 'common:testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common:result';
import { Task } from 'common:task';
import { resolve as abspath}  from 'path';

class TestDevice implements Device
{
    public started:boolean;
    public aborted:boolean;
    public rejectTimeout:any;
    public result_resolve:any;
    public testcase:TestCaseResults;

    public runTest(test:TestComponent):Promise<TestCaseResults> { 
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            this.result_resolve = resolve;
            this.started = true;
            if (test.scenario != null)
            {
                // Scenarios are a promise chain
                let scenario = require(abspath("./" + test.scenario));
                console.log(scenario);
                scenario.run().then(() => {
                    clearTimeout(this.rejectTimeout);
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
                });
            } else {
                resolve(new TestCaseResults({
                    worker_id: get('Worker.id'),
                    timestamp: new Date().getTime(),
                    passing: [new Result({
                        name: test.name,
                        classname: test.name,
                        status: TestStatus.PASSING
                    })]
                }));
            }
        });
    };

    public abortTest() { this.aborted = true; }
};

export class WorkerClient extends Worker
{
    public device:Device;
    public storage_id:string;
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
        switch(this.platform)
        {
            case Platforms.ELECTRON:
            case Platforms.PHOTON:
            case Platforms.BORON:
            case Platforms.ARGON:
            case Platforms.XENON:
                // Particle CLI
                this.device = new ParticleDevice();
                break;
            
            case Platforms.x86:
            case Platforms.x86_64:
                this.device = null; // NOT IMPLEMENTED
                break;

            default:
                this.device = new TestDevice();
                break;
        }
        setInterval(() => this.sendHeartbeat(), get('Worker.heartbeat'));
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
                this.device.runTest(this.task.test).then((result:TestCaseResults) =>
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
};
