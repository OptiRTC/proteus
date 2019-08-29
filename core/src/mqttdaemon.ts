
import { ProteusCore } from "core/proteuscore";
import { MQTTTransport } from "common/mqtttransport";
import { FileChangeAdapter } from "core/filechangeadapter";
import { AppveyorAdapter } from "core/appveyoradapter";

export class MQTTDaemon
{
    protected mqtt:MQTTTransport;
    protected core:ProteusCore;
    protected active:boolean;
    constructor(mqtt_ip:string)
    {
        this.mqtt = new MQTTTransport(mqtt_ip);
        this.core = new ProteusCore(this.mqtt);
        this.core.registerAdapter(new FileChangeAdapter('/tmp/proteus/job', '/tmp/proteus/result', this.core));
        this.core.registerAdapter(new AppveyorAdapter(this.core));
    
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
