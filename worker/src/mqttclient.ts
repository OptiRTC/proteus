import { WorkerClient } from "worker/workerclient";
import { MQTTTransport } from "common/mqtttransport";

export class MQTTClient
{
    protected mqtt:MQTTTransport;
    protected worker:WorkerClient;
    protected active:boolean;
    constructor(mqtt_ip:string)
    {
        this.mqtt = new MQTTTransport(mqtt_ip);
        this.worker = new WorkerClient(this.mqtt);
        this.active = true;
        process.on('SIGTERM', () => {
            this.active = false;
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
