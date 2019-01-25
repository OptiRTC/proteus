import { MessageTransport } from "messagetransport";
import { connect } from 'mqtt';
import { Partitions } from "protocol";
// MQTT topic Protocol: /partition/address/channel
export class MQTTTransport extends MessageTransport {
    constructor(server) {
        super();
        this.message_regex = new RegExp('/(.*)/(.*)/(.*)');
        this.client = connect(server);
        this.client.on('message', this.parseMessage);
        for (let channel in Partitions) {
            this.client.subscribe(channel);
        }
    }
    ;
    parseMessage(topic, content) {
        let parts = this.message_regex.exec(topic);
        super.recieveMessage(parts[1], parts[2], parts[3], JSON.parse(content));
    }
    ;
    sendMessage(partition, channel, address, content) {
        if (!this.client.connected && !this.client.reconnecting) {
            this.client.reconnect();
        }
        let topic = "/" + partition + "/" + channel + "/" + address;
        this.client.publish(topic, JSON.stringify(content));
    }
    ;
}
;
//# sourceMappingURL=mqtttransport.js.map