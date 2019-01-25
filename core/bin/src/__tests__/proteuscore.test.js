import { MessageTransport, Message } from "messagetransport";
import { ProteusCore } from "proteuscore";
import { Partitions, WorkerChannels, AdapterChannels, SystemChannels, JobChannels, TaskChannels } from "protocol";
import { TestComponent } from "testcomponents";
import { Adapter } from "adapter";
import { TestCaseResults, Result, TestStatus } from "result";
import { WorkerState } from "worker";
import { writeFileSync } from "fs";
import { Platforms } from "platforms";
import { Task } from "task";
test('Worker Discovery', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.poolCount()).toBe(1);
    core.handleWorkerDiscovery(new Message(Partitions.WORKERS, WorkerChannels.DISCOVER, "worker1", {
        'platform': "ELECTRON",
        'pool': 'default',
        'name': 'worker1'
    }));
    transport.processAll();
    expect(core.poolCount()).toBe(1);
});
test('Storage Handling', () => {
    class StorageListener {
        constructor() { this.called = false; }
        onMessage(message) {
            this.called = true;
            expect(message.content.path).toBeTruthy();
        }
        ;
    }
    ;
    let transport = new MessageTransport();
    let listener = new StorageListener();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.STORAGEREADY, null);
    let core = new ProteusCore(transport);
    core.handleSystemMessage(new Message(Partitions.SYSTEM, SystemChannels.STORAGE, null, null));
    transport.processAll();
    expect(listener.called).toBe(true);
});
test('Job Creation', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.jobCount()).toBe(0);
    expect(core.poolCount()).toBe(1);
    core.handleJobMessage(new Message(Partitions.JOBS, JobChannels.NEW, "0", {
        'platforms': ["ELECTRON"],
        'pool_id': "default",
        'adapter_id': "test",
        'build': '0.0.0-test',
        'tests': [new TestComponent({
                name: 'test1',
                binary: 'test1.bin',
                scenario: null,
                expectations: ['test1']
            })]
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
test('Adapter-to-worker-to-adapter', done => {
    // Create an Adapter
    // Create a pool and dummy worker
    // Push a job through adapter
    // Wait for Adapter to rec results
    class PassWorkerClient {
        constructor(transport) {
            this.transport = transport;
        }
        onMessage(message) {
            switch (message.channel) {
                case WorkerChannels.TASK:
                    let results = [];
                    console.log(message.content);
                    let t = new Task().fromJSON(message.content);
                    for (let expectation of t.test.expectations) {
                        results.push(new Result({
                            name: expectation,
                            classname: expectation,
                            status: TestStatus.PASSING,
                            assertions: 1,
                            finished: new Date().getTime(),
                            messages: []
                        }));
                    }
                    this.transport.sendMessage(Partitions.TASKS, TaskChannels.RESULT, t.id, new TestCaseResults({
                        worker_id: message.address,
                        passing: results,
                        failed: [],
                        task: t
                    }));
                    this.transport.sendMessage(Partitions.WORKERS, WorkerChannels.STATUS, t.worker_id, {
                        'state': WorkerState.IDLE
                    });
                    break;
                case WorkerChannels.QUERY:
                    this.transport.sendMessage(Partitions.WORKERS, WorkerChannels.STATUS, t.worker_id, {
                        'state': WorkerState.IDLE
                    });
                    break;
                default:
                    break;
            }
        }
    }
    ;
    class TestAdapter extends Adapter {
        constructor(transport, name) {
            super(transport, name);
            this.done = false;
        }
        ;
        loadJob(store) {
            writeFileSync(store.path + "/tests.json", JSON.stringify({
                "name": "ProductTests",
                "platforms": [Platforms.ELECTRON, Platforms.PHOTON],
                "pool": "product_dev",
                "tests": [
                    {
                        "name": "BasicUnitTest",
                        "binary": "product_unittest.bin",
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
        }
        ;
        handleResults(results) {
            expect(results.length).toBe(2);
            expect(results[0].passing.length).toBe(4);
            expect(results[1].passing.length).toBe(4);
            this.done = true;
            done();
        }
        ;
    }
    ;
    let transport = new MessageTransport();
    let worker = new PassWorkerClient(transport);
    transport.subscribe(worker, Partitions.WORKERS, WorkerChannels.TASK, null);
    let adapter = new TestAdapter(transport, 'test');
    let core = new ProteusCore(transport);
    core.registerAdapter(adapter);
    transport.sendMessage(Partitions.WORKERS, WorkerChannels.DISCOVER, 'testworker', {
        'platform': Platforms.ELECTRON,
        'pool_id': 'default',
        'id': 'testworker'
    });
    transport.sendMessage(Partitions.WORKERS, WorkerChannels.DISCOVER, 'testworker2', {
        'platform': Platforms.PHOTON,
        'pool_id': 'default',
        'id': 'testworker2'
    });
    transport.processAll();
    adapter.startJob();
    setInterval(() => {
        transport.process();
        core.process();
    }, 100);
});
//# sourceMappingURL=proteuscore.test.js.map