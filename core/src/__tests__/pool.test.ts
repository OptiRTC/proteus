import { Platforms } from "platforms";
import { TransportClient, MessageTransport, Message } from "messagetransport";
import { Pool } from "pool";
import { Partitions, WorkerChannels, TaskChannels } from "protocol";
import { Task } from "task";
import { TestComponent } from "testcomponents";
import { Worker, WorkerState } from "worker";
import { Result, TestCases, TestStatus } from "result";

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
        "pool": "default",
        "name": "worker1",
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
        "pool": "default",
        "name": "worker1",
        "platform": Platforms.ELECTRON
    };
    let transport = new MessageTransport();
    let pool = new Pool("default", transport, 180);
    pool.discoverWorker(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        null,
        worker_discovery));
    transport.processAll();
    expect(pool.workers.length).toBe(1);
    transport.sendMessage(new Message(
        Partitions.WORKERS,
        WorkerChannels.STATUS,
        "worker1",
        {
            "pool": "different_pool",
            "name": "worker1",
            "platform": Platforms.ELECTRON,

        }));
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
            transport.sendMessage(new Message(
                Partitions.TASKS,
                TaskChannels.RESULT,
                task.id,
                new TestCases(
                    "worker1",
                    [
                        new Result("A", "A", TestStatus.PASSING, 1, new Date().getTime(), [])
                    ],
                    [
                        new Result("C", "C", TestStatus.FAILED, 1, new Date().getTime(), ["failed"])
                    ],
                    task)));
            transport.sendMessage(new Message(
                Partitions.WORKERS,
                WorkerChannels.STATUS,
                "worker1",
                { 
                    'state': WorkerState.IDLE,
                    'pool': pool.id
                }));
        }
    };
    let transport = new MessageTransport();
    let worker_client = new DummyWorker(transport);
    transport.subscribe(worker_client, Partitions.WORKERS, WorkerChannels.TASK, null);
    let pool = new Pool("default", transport, 2000);
    let tasks = [
        new Task('0.0.0', '1', null, Platforms.ELECTRON, null, "/tmp/test",
        new TestComponent("test1", "test1.bin", "test.js", ["A", "B", "C"])),
        new Task('0.0.0', '2', null, Platforms.ELECTRON, null, "/tmp/test",
        new TestComponent("test2", "test2.bin", "test.js", ["A", "B", "C"])),
        new Task('0.0.0', '3', null, Platforms.ELECTRON, null, "/tmp/test",
        new TestComponent("test3", "test3.bin", "test.js", ["A", "B", "C"]))
    ];
    pool.addTasks(tasks);
    pool.addWorker(new Worker(
        "worker1",
        pool.id,
        Platforms.ELECTRON,
        transport,
        180));
    expect(pool.queueSize()).toBe(3);
    pool.process(); // Set task, push task message
    expect(pool.queueSize()).toBe(2);
    pool.process(); // No idle workers, noop
    expect(pool.queueSize()).toBe(2);
    expect(pool.activeCount()).toBe(1);
    transport.processAll(); // Drain out 
    expect(pool.activeCount()).toBe(0);
    pool.process(); // Worker idle, dequeue
    expect(pool.queueSize()).toBe(1);
    expect(pool.activeCount()).toBe(1);
});
