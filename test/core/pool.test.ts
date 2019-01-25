import { Platforms } from "common:platforms";
import { TransportClient, MessageTransport, Message } from "common:messagetransport";
import { Pool } from "core:pool";
import { Partitions, WorkerChannels, TaskChannels } from "common:protocol";
import { Task } from "common:task";
import { TestComponent } from "common:testcomponents";
import { Worker, WorkerState } from "common:worker";
import { Result, TestCaseResults, TestStatus } from "common:result";

test('Worker Discovery sets worker config', () => {
    class WorkerConfListener implements TransportClient
    {
        public called:boolean;
        constructor(){ this.called = false; }
        public onMessage(message:Message)
        {
            this.called = true;
        };

    };
    let worker_discovery = {
        "pool_id": "default",
        "id": "worker1",
        "platform": Platforms.ELECTRON
    };
    let listener = new WorkerConfListener();
    let transport = new MessageTransport();
    transport.subscribe(listener, Partitions.WORKERS,
        WorkerChannels.CONFIG, null);
    let pool = new Pool("default", transport, 180);
    pool.discoverWorker(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        null,
        worker_discovery));
    transport.processAll();
    expect(pool.workers.length).toBe(1);
    expect(listener.called).toBe(true);
});

test('Remove Worker', () => {
    let worker_discovery = {
        "pool_id": "default",
        "id": "worker1",
        "platform": Platforms.ELECTRON
    };
    let transport = new MessageTransport();
    let pool = new Pool("default", transport, 180);
    pool.discoverWorker(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        "worker1",
        worker_discovery));
    transport.processAll();
    expect(pool.workers.length).toBe(1);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.STATUS,
        "worker1",
        {
            "pool_id": "different_pool",
            "id": "worker1",
            "platform": Platforms.ELECTRON,

        });
    transport.processAll();
    expect(pool.workers.length).toBe(0);

});

test('Task Dispatch', () => {
    class DummyWorker implements TransportClient
    {
        constructor(public transport:MessageTransport) {};
        public onMessage(message:Message)
        {
            let task = message.content;
            transport.sendMessage(
                Partitions.TASKS,
                TaskChannels.RESULT,
                task.id,
                new TestCaseResults({
                    worker_id: "worker1",
                    passing: [
                        new Result({
                            name: "A",
                            classname: "A",
                            status: TestStatus.PASSING,
                            assertions: 1,
                            finished: new Date().getTime(),
                            messages: []})
                    ],
                    failed: [
                        new Result({
                            name: "C",
                            classname: "C",
                            status: TestStatus.FAILED,
                            assertions: 1,
                            finished: new Date().getTime(),
                            messages: ["failed"]})
                    ],
                    task: task}));
            transport.sendMessage(
                Partitions.WORKERS,
                WorkerChannels.STATUS,
                "worker1",
                { 
                    'state': WorkerState.IDLE,
                    'pool_id': pool.id
                });
        }
    };
    let transport = new MessageTransport();
    let worker_client = new DummyWorker(transport);
    transport.subscribe(worker_client, Partitions.WORKERS, WorkerChannels.TASK, null);
    let pool = new Pool("default", transport, 2000);
    let tasks = [
        new Task({
            build: '0.0.0',
            job_id: '1',
            worker_id: null,
            platform: Platforms.ELECTRON,
            pool_id: null,
            storage_id: "/tmp/test",
            test: new TestComponent({
                name: "test1",
                binary: "test1.bin",
                scenario: "test.js",
                expectations: ["A", "B", "C"]})}),
        new Task({
            build: '0.0.0',
            job_id: '2',
            worker_id: null,
            platform: Platforms.ELECTRON,
            pool_id: null,
            storage_id: "/tmp/test",
            test: new TestComponent({
                name: "test2",
                binary: "test2.bin",
                scenario: "test.js",
                expectations: ["A", "B", "C"]})}),
        new Task({
            build: '0.0.0',
            job_id: '3',
            worker_id: null,
            platform: Platforms.ELECTRON,
            pool_id: null,
            storage_id: "/tmp/test",
            test: new TestComponent({
                name: "test3",
                binary: "test3.bin",
                scenario: "test.js",
                expectations: ["A", "B", "C"]})})
    ];
    pool.addTasks(tasks);
    pool.addWorker(new Worker(
        "worker1",
        pool.id,
        Platforms.ELECTRON,
        transport,
        180));
    expect(pool.queueSize()).toBe(3);
    expect(pool.activeCount()).toBe(0);
    pool.process(); // Set task, push task message
    expect(pool.queueSize()).toBe(2);
    expect(pool.activeCount()).toBe(1);
    pool.process(); // No idle workers, noop
    expect(pool.queueSize()).toBe(2);
    expect(pool.activeCount()).toBe(1);
    transport.processAll();
    expect(pool.queueSize()).toBe(2);
    expect(pool.activeCount()).toBe(0);
    pool.process();
    expect(pool.queueSize()).toBe(1);
    expect(pool.activeCount()).toBe(1);
    transport.processAll(); // Drain out 
    expect(pool.queueSize()).toBe(1);
    expect(pool.activeCount()).toBe(0);
    pool.process();
    expect(pool.queueSize()).toBe(0);
    expect(pool.activeCount()).toBe(1);
    transport.processAll();
    expect(pool.queueSize()).toBe(0);
    expect(pool.activeCount()).toBe(0);
});
