import {Message, MessageTransport} from "messagetransport";
import {connect, Client} from 'mqtt';
import { Partitions } from "protocol";

// MQTT topic Protocol: /partition/address/channel
export class MQTTTransport extends MessageTransport
{
    protected client:Client;
    protected message_regex;
    constructor(server:string)
    {
        super();
        this.message_regex = new RegExp('/(.*)/(.*)/(.*)')
        this.client = connect(server);
        this.client.on('message', this.parseMessage);
        for(let channel in Partitions)
        {
            this.client.subscribe(channel);
        }
    };

    protected parseMessage(topic:string, content)
    {
        let parts = this.message_regex.exec(topic);
        super.recieveMessage(parts[1], parts[2], parts[3], JSON.parse(content));
    };

    public sendMessage(message:Message)
    {
        if (!this.client.connected && !this.client.reconnecting)
        {
            this.client.reconnect();
        }
        let topic = "/" + message.partition + "/" + message.channel + "/" + message.address;
        this.client.publish(topic, JSON.stringify(message.content));
    };
};
