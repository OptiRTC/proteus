import {Partitions} from "protocol";

export class Message
{
    constructor(
        public partition:Partitions,
        public channel:string,
        public address:string,
        public content:any)
    {};
};

class DispatchSubscription
{
    constructor(
        public reciever:any,
        public partition:Partitions,
        public channel:string,
        public address:string)
    {}
};

export interface TransportClient
{
    onMessage(message:Message);
};

// Abstract PUB/SUB and API transport
export class MessageTransport
{
    private subscriptions:DispatchSubscription[];
    private queue:Message[];

    public sendMessage(message:Message) {};

    public recieveMessage(partition:Partitions, channel:string, address:string, content:any)
    {
        this.queue.push(new Message(partition, channel, address, content));
    };

    private nextMessage(): Message
    {
        if (this.queue.length > 0)
        {
            return this.queue.shift();
        }
        return null;
    };

    public subscribe(reciever:TransportClient, partition:Partitions, channel:string, address:string)
    {
        this.subscriptions.push((new DispatchSubscription(
            reciever,
            partition,
            channel,
            address)));
    };

    public unsubscribe(reciever:any, partition:Partitions, channel:string, address:string)
    {
        for(let sub of this.subscriptions)
        {
            if (sub.reciever == reciever &&
                sub.partition == partition &&
                sub.channel == channel &&
                sub.address == address)
            {
                this.subscriptions.slice(this.subscriptions.indexOf(sub), 1);
                break;
            }
        }
    };

    private dispatchMessage(message:Message)
    {
        for(let sub of this.subscriptions)
        {
            if ((sub.partition == null ||
                 sub.partition == message.partition) &&
                (sub.channel == null ||
                 sub.channel == message.channel) &&
                (sub.address == null ||
                 sub.address == message.address))
            {
                sub.reciever.onMessage(message);
            }
        }
    };

    public process()
    {
        let message = this.nextMessage();
        if(message != null)
        {
            this.dispatchMessage(message);
        }
    };
};
