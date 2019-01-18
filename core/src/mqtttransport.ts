import {Message, MessageTransport} from "./messagetransport";
import {connect} from 'mqtt';

// MQTT topic Protocol: /partition/address/channel
export class MQTTTransport extends MessageTransport
{
    private client;
    private message_regex;
    constructor(server:string)
    {
        super();
        this.message_regex = new RegExp('/(.*)/(.*)/(.*)')
        this.client = connect(server);
        this.client.on('message', this.parseMessage);
    };

    private parseMessage(topic:string, content)
    {
        let parts = this.message_regex.exec(topic);
        super.recieveMessage(parts[1], parts[3], parts[2], JSON.parse(content));
    };

    public sendMessage(message:Message)
    {
        if (!this.client.connected && !this.client.reconnecting)
        {
            this.client.reconnect();
        }
        let topic = "/" + message.partition + "/" + message.address + "/" + message.channel;
        this.client.publish(topic, JSON.stringify(message.content));
    };
};
