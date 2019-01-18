import { MessageTransport } from 'common/messagetransport';
import { MQTTTransport } from 'common/mqtttransport';
import { get } from 'config';
import { TestComponent } from 'common/testcomponents';
import { Result, TestCaseResults, TestStatus } from 'common/result';
import { WorkerClient } from 'worker/workerclient';

export class DummyClient extends WorkerClient
{
    constructor(transport:MessageTransport)
    {
        super(transport);
    };

    public runTest(test:TestComponent):Promise<TestCaseResults> {
        console.log("Dummy Test");
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            resolve(new TestCaseResults({
                worker_id: get('Worker.id'),
                timestamp: new Date().getTime(),
                failed: test.expectations.map((item) => new Result({
                    name: item,
                    classname: test.scenario,
                    status: TestStatus.FAILED,
                    finished: new Date().getTime(),
                    messages: ["Dummy Error"]}))
            }));
        });
    };
};

export class DummyMQTTClient
{
    protected mqtt:MQTTTransport;
    protected worker:DummyClient;
    protected active:boolean;
    constructor(mqtt_ip:string)
    {
        this.mqtt = new MQTTTransport(mqtt_ip);
        this.worker = new DummyClient(this.mqtt);
        this.active = true;
        process.on('SIGTERM', () => {
            this.active = false;
            process.exit(0);
        });
    }

    public run()
    {
        this.mqtt.process();
        if (this.active)
        {
            setImmediate(() => this.run());
        }
    };
};

let dummyworker = new DummyMQTTClient(get('Core.MessageServer'));
dummyworker.run();

