import { MessageTransport } from 'common/messagetransport';
import { get } from 'config';
import { TestComponent } from 'common/testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { WorkerClient } from 'worker/workerclient';
import { Platforms } from 'common/platforms';
import { MQTTClient } from 'worker/mqttclient';

export class DummyClient extends WorkerClient
{
    constructor(transport:MessageTransport)
    {
        super(transport);
        this.id = "DummyWorker";
        this.pool_id = "default";
        this.platform = Platforms.ELECTRON;
        this.timeout = 100000;
    };

    public runTest(test:TestComponent):Promise<TestCaseResults> {
        console.log("Running Test");
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            resolve(new TestCaseResults({
                worker_id: get('Worker.id'),
                timestamp: new Date().getTime(),
                failed: [new Result({
                    name: test.scenario,
                    classname: test.scenario,
                    status: TestStatus.FAILED,
                    messages: ["Dummy Error"]})
                ]
            }));
        });
    };
};

export class DummyMQTTClient extends MQTTClient
{
    constructor(mqtt_ip:string)
    {
        super(mqtt_ip);
        this.worker = new DummyClient(this.mqtt);
    }
};

process.on('unhandledRejection', (r, p) => {
    console.log('UnandledPromiseRejection', p, 'reason', r);
})

let worker = new DummyMQTTClient(get('Core.MessageServer'));
worker.run();

