import { ProteusCore } from "proteuscore";
import { MQTTTransport } from "mqtttransport";
export class MQTTDaemon {
    constructor(mqtt_ip) {
        this.mqtt = new MQTTTransport(mqtt_ip);
        this.core = new ProteusCore(this.mqtt);
        this.active = true;
        process.on('SIGTERM', () => {
            this.active = false;
        });
    }
    run() {
        while (this.active) {
            this.core.process();
        }
    }
    ;
}
;
//# sourceMappingURL=mqttdaemon.js.map