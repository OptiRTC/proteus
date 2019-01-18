import { MessageTransport, Message, TransportClient } from "common/messagetransport";
import { ProteusCore } from "core/proteuscore";
import { Partitions, WorkerChannels, AdapterChannels, SystemChannels, JobChannels, TaskChannels } from "common/protocol";
import { TestComponent } from "common/testcomponents";
import { Adapter } from "core/adapter";
import { TestCaseResults, Result, TestStatus } from "common/result";
import { WorkerState } from "common/worker";
import { writeFileSync } from "fs";
import { Platforms } from "common/platforms";
import { Task } from "common/task";
import request from 'request';
import AdmZip from 'adm-zip';
import * as fs from 'fs';

test('Worker Discovery', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.poolCount()).toBe(1);

    core.handleWorkerDiscovery(new Message(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        "worker1",
        {
            'platform': "ELECTRON",
            'pool': 'default',
            'name': 'worker1'
        }));
    transport.processAll();
    expect(core.poolCount()).toBe(1);
    core.close();
});

test('Storage Handling', done => {
    class StorageListener implements TransportClient
    {
        public onMessage(message:Message)
        {
            core.close();
            expect(message.content.path).toBeTruthy();
            done();
        };
    };
    let transport = new MessageTransport();
    let listener = new ProteusStorageListener();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.STORAGEREADY, null);
    let core = new ProteusCore(transport);
    transport.sendMessage(
        Partitions.SYSTEM,
        SystemChannels.STORAGE,
        null,
        null);
    transport.processAll();
});

test('File Delivery', done => {
    let test_object = {test: "X"};
    class StorageListener implements TransportClient
    {
        public onMessage(message:Message)
        {
            expect(message.content.path).toBeTruthy();
            writeFileSync(message.content.path + "/test.txt", JSON.stringify(test_object), "utf8");
            let storeUrl = 'http://localhost:3000/' + message.content.id;
            let targetFile = '/tmp/unzip-' + message.content.id + '.zip';
            request(storeUrl, {encoding: 'binary'}, (err, res, body) => {
                core.close();
                fs.writeFileSync(targetFile, body, 'binary');
                let zip = new AdmZip(targetFile);
                zip.extractAllTo('/tmp/unzip-' + message.content.id, true);
                let result_object = JSON.parse(fs.readFileSync('/tmp/unzip-' + message.content.id + '/test.txt', "utf8"));
                expect(result_object).toEqual(test_object);
                done();
            });
        };
    };
    let transport = new MessageTransport();
    let listener = new ProteusStorageListener();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.STORAGEREADY, null);
    let core = new ProteusCore(transport);
    transport.sendMessage(
        Partitions.SYSTEM,
        SystemChannels.STORAGE,
        null,
        null);
    transport.processAll();
});

test('Job Creation', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.jobCount()).toBe(0);
    expect(core.poolCount()).toBe(1);

    transport.sendMessage(
        Partitions.JOBS,
        JobChannels.NEW,
        "0",
        {
            'platforms': ["ELECTRON"],
            'pool_id': "default",
            'adapter_id': "test",
            'build': '0.0.0-test',
            'tests': [ new TestComponent({
                name: 'test1',
                binary: 'test1.bin',
                scenario: null,
                expectations: ['test1']})]
        });
    transport.processAll();
    expect(core.poolCount()).toBe(1);
    expect(core.jobCount()).toBe(1);
    core.close();
});

test('Adapter Registration', () => {
    let transport = new MessageTransport();
    let core = new ProteusCore(transport);
    expect(core.adapterCount()).toBe(0);
    core.registerAdapter(new Adapter(transport, "test"));
    expect(core.adapterCount()).toBe(1);
    core.close();
});

test('Adapter-to-worker-to-adapter', done => {
    // Create an Adapter
    // Create a pool and dummy worker
    // Push a job through adapter
    // Wait for Adapter to rec results
    class PassWorkerClient implements TransportClient
    {
        constructor(public transport:MessageTransport){}
        public onMessage(message:Message)
        {
            switch(message.channel)
            {

                case WorkerChannels.TASK:
                    let results = [];
                    let t = new Task().fromJSON(message.content);
                    for(let expectation of t.test.expectations)
                    {
                        results.push(new Result({
                            name: expectation,
                            classname: expectation,
                            status: TestStatus.PASSING,
                            assertions: 1,
                            finished: new Date().getTime(),
                            messages: []}));
                    }
                    this.transport.sendMessage(
                        Partitions.TASKS,
                        TaskChannels.RESULT,
                        t.id,
                        new TestCaseResults({
                            worker_id: message.address,
                            passing: results,
                            failed: [],
                            task: t}));
                    this.transport.sendMessage(
                                Partitions.WORKERS,
                                WorkerChannels.STATUS,
                                t.worker_id,
                                { 
                                    'state': WorkerState.IDLE
                                });
                    break;
                case WorkerChannels.QUERY:
                    this.transport.sendMessage(
                        Partitions.WORKERS,
                        WorkerChannels.STATUS,
                        t.worker_id,
                        { 
                            'state': WorkerState.IDLE
                        });
                    break;
                default:
                    break;
            }
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

        public loadJob(storage_path:string, storage_id:string)
        {
            writeFileSync(
                storage_path + "/test.json", 
                JSON.stringify(
                {
                    "name": "ProductTests",
                    "platforms": [ Platforms.ELECTRON, Platforms.PHOTON],
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
            super.loadJob(storage_path, storage_id);
        };

        public handleResults(results:TestCaseResults[])
        {
            core.close();
            expect(results.length).toBe(2);
            expect(results[0].passing.length).toBe(4);
            expect(results[1].passing.length).toBe(4);
            this.done = true;
            done();
        };
    };
    let transport = new MessageTransport();
    let worker = new PassWorkerClient(transport);
    transport.subscribe(worker, Partitions.WORKERS, WorkerChannels.TASK, null);
    let adapter = new TestAdapter(transport, 'test');
    let core = new ProteusCore(transport);
    core.registerAdapter(adapter);
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        'testworker',
        { 
            'platform': Platforms.ELECTRON,
            'pool_id': 'default',
            'id': 'testworker'
        });
    transport.sendMessage(
        Partitions.WORKERS,
        WorkerChannels.DISCOVER,
        'testworker2',
        {
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
