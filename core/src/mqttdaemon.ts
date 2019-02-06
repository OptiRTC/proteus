import { ProteusCore } from "core/proteuscore";
import { MQTTTransport } from "common/mqtttransport";

export class MQTTDaemon
{
    protected mqtt:MQTTTransport;
    protected core:ProteusCore;
    protected active:boolean;
    constructor(mqtt_ip:string)
    {
        this.mqtt = new MQTTTransport(mqtt_ip);
        this.core = new ProteusCore(this.mqtt);
        this.active = true;
        process.on('SIGTERM', () => {
            this.active = false;
        });
    }

    public run()
    {
        while(this.active)
        {
            this.core.process();
        }
        this.core.close();
    };
};
