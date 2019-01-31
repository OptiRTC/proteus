import { Message, MessageTransport, TransportClient } from 'common:messagetransport';
import { WorkerClient } from 'worker:workerclient';
import { Partitions, WorkerChannels, TaskChannels } from 'common:protocol';

test('Loads config', () => {
    let transport = new MessageTransport();
    let client = new WorkerClient(transport);
    expect(client.id).toBe("TestWorker");
});

test('Runs test', done => {
    class ResultListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.address).toBe("TestWorker");
            done();
        };
    };
    let transport = new MessageTransport();
    let listener = new ResultListener();
    transport.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
    let client = new WorkerClient(transport);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.TASK,
        "TestWorker",
        {
            build: "0.0.0-0",
            job_id: "0",
            platform: "test",
            pool_id: "default",
            storage_id: "/tmp/test/",
            test: {
                name: "App Scen",
                binary: "app.bin",
                scenario: null,
                expectations: [ "Test" ]
            },
            timestamp: new Date().getTime(),
        });
    transport.processAll();
    expect(client.id).toBe("TestWorker");
});

test('Handles passing scenario', done => {
    class ResultListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.address).toBe("TestWorker");
            expect(message.content.passing.length).toBe(1);
            expect(message.content.failed.length).toBe(0);
            done();
        };
    };
    let transport = new MessageTransport();
    let listener = new ResultListener();
    transport.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
    let client = new WorkerClient(transport);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.TASK,
        "TestWorker",
        {
            build: "0.0.0-0",
            job_id: "0",
            platform: "test",
            pool_id: "default",
            storage_id: "/tmp/test/",
            test: {
                name: "TestScen",
                binary: "app.bin",
                scenario: "testscen.js",
                expectations: [ "TestScen" ]
            },
            timestamp: new Date().getTime(),
        });
    transport.processAll();
    expect(client.id).toBe("TestWorker");
});

test('Catches failed scenario', done => {
    class ResultListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.address).toBe("TestWorker");
            expect(message.content.passing.length).toBe(0);
            expect(message.content.failed.length).toBe(1);
            done();
        };
    };
    let transport = new MessageTransport();
    let listener = new ResultListener();
    transport.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
    let client = new WorkerClient(transport);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.TASK,
        "TestWorker",
        {
            build: "0.0.0-0",
            job_id: "0",
            platform: "test",
            pool_id: "default",
            storage_id: "/tmp/test/",
            test: {
                name: "FailScen",
                binary: "app.bin",
                scenario: "failscen.js",
                expectations: [ "FailScen" ]
            },
            timestamp: new Date().getTime(),
        });
    transport.processAll();
    expect(client.id).toBe("TestWorker");
}, 180000);

test('Query response', done => {
    class StatusListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.address).toBe("TestWorker");
            done();
        };
    };
    let transport = new MessageTransport();
    let listener = new StatusListener();
    transport.subscribe(listener, Partitions.WORKERS, WorkerChannels.QUERY, null);
    let client = new WorkerClient(transport);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.QUERY,
        "TestWorker",
        null);
    transport.processAll();
    expect(client.id).toBe("TestWorker");
});
