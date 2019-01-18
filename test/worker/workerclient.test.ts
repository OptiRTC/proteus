import { Message, MessageTransport, TransportClient } from 'common/messagetransport';
import { WorkerClient } from 'worker/workerclient';
import { Partitions, WorkerChannels, TaskChannels } from 'common/protocol';
import { Artifacts } from 'common/artifacts';
import * as ncp from 'ncp';

test('Loads config', () => {
    let transport = new MessageTransport();
    let client = new WorkerClient(transport);
    expect(client.id).toBe("TestWorker");
});

test('Handles passing scenario', done => {
    class ResultListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.content.passing.length).toBe(1);
            expect(message.content.failed.length).toBe(0);
            expect(message.content.skipped.length).toBe(0);
            clearInterval(interval);
            mockArt.close();
            done();
        };
    };
    let transport = new MessageTransport();
    let mockArt = new Artifacts(transport);
    let store_id = mockArt.newStorage();
    let store = mockArt.getStore(store_id);
    
    let listener = new ResultListener();
    transport.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
    let client = new WorkerClient(transport);
    let interval;
    new Promise((resolve, reject) => {
        ncp('worker/store', store.path, { clobber: true}, (err) => {
            if (!err)
            {
                resolve();
            } else {
                reject();
            }
        });
    }).then(() => {
        transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.TASK,
            "TestWorker",
            {
                build: "0.0.0-0",
                job_id: "0",
                platform: "test",
                pool_id: "default",
                storage_id: store_id,
                test: {
                    name: "TestScen",
                    binary: "app.bin",
                    scenario: "testscen.js",
                    expectations: [ "PassTest" ]
                },
                timestamp: new Date().getTime(),
            });
        transport.processAll();
        interval = setInterval(() => {
            transport.process();
            client.sendHeartbeat();
        }, 250);
    });
});

test('Handles failed scenario', done => {
    class ResultListener implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.content.passing.length).toBe(0);
            expect(message.content.failed.length).toBe(1);
            expect(message.content.skipped.length).toBe(0);
            clearInterval(interval);
            mockArt.close();
            done();
        };
    };
    let transport = new MessageTransport();
    let mockArt = new Artifacts(transport);
    let store_id = mockArt.newStorage();
    let store = mockArt.getStore(store_id);
    let listener = new ResultListener();
    transport.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
    let client = new WorkerClient(transport);
    let interval;
    ncp('worker/store', store.path, (err) => {
        transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.TASK,
            "TestWorker",
            {
                build: "0.0.0-0",
                job_id: "0",
                platform: "test",
                pool_id: "default",
                storage_id: store_id,
                test: {
                    name: "TestScen",
                    binary: "app.bin",
                    scenario: "failscen.js",
                    expectations: [ "FailTest" ]
                },
                timestamp: new Date().getTime(),
            });
        transport.processAll();
        expect(client.id).toBe("TestWorker");
        interval = setInterval(() => transport.process(), 250);
    });
});

test('Query response', done => {
    class StatusListener implements TransportClient {
        public called:boolean;
        constructor() { this.called = false; }
        public onMessage(message:Message)
        {
            this.called = true;
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
    setInterval(() => transport.process(), 250);
});
