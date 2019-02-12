import { TransportClient, Message } from "common/messagetransport";
import { ProteusCore } from "core/proteuscore";
import { MQTTTransport } from "common/mqtttransport";
import { FileChangeAdapter } from "core/filechangeadapter";
import { AppveyorAdapter } from "core/appveyoradapter";

class ConsoleOutputListener implements TransportClient
{
    public onMessage(message:Message)
    {
        console.log(message.partition, message.channel, message.address);
        console.log("INFO: ", message);
    }
}

export class MQTTDaemon
{
    protected mqtt:MQTTTransport;
    protected core:ProteusCore;
    protected active:boolean;
    constructor(mqtt_ip:string)
    {
        this.mqtt = new MQTTTransport(mqtt_ip);
        let console_listener = new ConsoleOutputListener();
        this.mqtt.subscribe(console_listener, null, null, null);
        this.core = new ProteusCore(this.mqtt);
        this.core.registerAdapter(new FileChangeAdapter(this.mqtt, '/tmp/proteus/job', '/tmp/proteus/result'));
        this.core.registerAdapter(new AppveyorAdapter(this.mqtt));
    
        this.active = true;
        process.on('SIGTERM', () => {
            this.active = false;
        });
    }

    public run()
    {
        this.core.process();
        if (this.active == true)
        {
            setImmediate(() => this.run());
        } else {
            console.log("Exit");
            this.core.close();
        }
    };
};
