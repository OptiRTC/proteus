import { MessageTransport, Message, TransportClient } from "messagetransport";
import { ProteusCore } from "proteuscore";
import { Partitions, WorkerChannels, AdapterChannels, SystemChannels, JobChannels, TaskChannels } from "protocol";
import { TestComponent } from "testcomponents";
import { Adapter } from "adapter";
import { TestCases, Result, TestStatus } from "result";
import { WorkerState } from "worker";
import { writeFileSync } from "fs";
import { TmpStorage } from "storage";

test('Worker Discovery', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.poolCount()).toBe(0);

    core.handleWorkerDiscovery(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        "worker1",
        {
            'platform': "ELECTRON",
            'pool': 'default',
            'name': 'worker1'
        }));
    
    expect(core.poolCount()).toBe(1);
});

test('Storage Handling', () => {
    class StorageListener implements TransportClient
    {
        public called:boolean;
        constructor() {this.called = false; }
        public onMessage(message:Message)
        {
            this.called = true;
            expect(message.content.path).toBeTruthy();
        };
    };
    let transport = new MessageTransport();
    let listener = new StorageListener();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.STORAGEREADY, null);
    let core = new ProteusCore(transport);
    core.handleSystemMessage(new Message(
        Partitions.SYSTEM,
        SystemChannels.STORAGE,
        null,
        null));
    transport.processAll();
    expect(listener.called).toBe(true);
});

test('Job Creation', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.jobCount()).toBe(0);
    expect(core.poolCount()).toBe(0);

    core.handleJobMessage(new Message(
        Partitions.JOBS,
        JobChannels.NEW,
        "0",
        {
            'platforms': ["ELECTRON"],
            'pool': "default",
            'adapter_id': "test",
            'build': '0.0.0-test',
            'tests': [ new TestComponent('test1', 'test1.bin', null, ['test1'])]
        }));
    
    expect(core.poolCount()).toBe(1);
    expect(core.jobCount()).toBe(1);
});

test('Adapter Registration', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.adapterCount()).toBe(0);
    core.registerAdapter(new Adapter(transport, "test"));
    expect(core.adapterCount()).toBe(1);
});

test('Adapter-to-worker-to-adapter', () => {
    // Create an Adapter
    // Create a pool and dummy worker
    // Push a job through adapter
    // Wait for Adapter to rec results
    class PassWorkerClient implements TransportClient
    {
        constructor(public transport:MessageTransport){}
        public onMessage(message:Message)
        {
            let results = [];
            for(let expectation of message.content.test.expectation)
            {
                results.push(new Result(
                    expectation,
                    expectation,
                    TestStatus.PASSING,
                    1,
                    new Date().getTime(),
                    []));
            }
            this.transport.sendMessage(new Message(
                Partitions.TASKS,
                TaskChannels.RESULT,
                message.content.task.id,
                new TestCases(
                    message.address,
                    results,
                    [],
                    message.content.task)));
            this.transport.sendMessage(new Message(
                        Partitions.WORKERS,
                        WorkerChannels.STATUS,
                        message.content.worker_id,
                        { 
                            'state': WorkerState.IDLE
                        }));
        }
    };
    class TestAdapter extends Adapter
    {
        public done:boolean;
        constructor(transport:MessageTransport, name:string)
        {
            super(transport, name);
            this.done = false;
        };

        public loadJob(store:TmpStorage)
        {
            writeFileSync(
                store.path + "/tests.json", 
                JSON.stringify(
                {
                    "name": "ProductTests",
                    "platforms": [ "electron", "photon"],
                    "pool": "product_dev",
                    "tests": [
                        {
                            "name": "BasicUnitTest",
                            "binary":"product_unittest.bin",
                            "expectations": [
                                "BasicTest01",
                                "BasicTest02",
                                "ProductAssertsTrue",
                                "ProductParser"
                            ]
                        }
                    ]
                }));
            super.loadJob(store);
        };

        public handleResults(results:TestCases[])
        {
            expect(results.length).toBe(8);
            this.done = true;
        };
    };
    let transport = new MessageTransport();
    let worker = new PassWorkerClient(transport);
    transport.subscribe(worker, Partitions.WORKERS, WorkerChannels.TASK, null);
    let adapter = new TestAdapter(transport, 'test');
    let core = new ProteusCore(transport);
    core.registerAdapter(adapter);
    transport.sendMessage(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        'testworker',
        { 
            'plaform': 'electron',
            'pool': 'default',
            'name': 'testworker'
        }));
    transport.sendMessage(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        'testworker2',
        {
            'platform': 'photon',
            'pool': 'default',
            'name': 'testworker2'
        }));
    transport.processAll();
    adapter.startJob();
    while(!adapter.done)
    {
        transport.process();
        core.process();
    }
});
