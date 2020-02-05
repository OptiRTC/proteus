import {Partitions} from "common/protocol";

export interface Transportable {
    toJSON():any; // Deflate nested types
    fromJSON(content:any):Transportable; // Inflate nested types
};

export function ArrayToJSON(input:Transportable[]):any[]
{
    let json = input.map((item) => item.toJSON())
    return json;
};

export function ArrayFromJSON<T extends Transportable>(ctor: new(content?:any) => T, input:any[]): T[]
{
    return input.map((item) => {
        return new ctor().fromJSON(item) as T;
    });
};

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
    protected subscriptions:DispatchSubscription[];
    protected queue:Message[];

    constructor()
    {
        this.subscriptions = [];
        this.queue = [];
    }

    public sendMessage(partition:Partitions, channel:string, address:string, content:any) {
        // Loopback
        this.recieveMessage(
            partition,
            channel,
            address,
            content);
    };

    public recieveMessage(partition:Partitions, channel:string, address:string, content:any)
    {
        this.queue.push(new Message(partition, channel, address, content));
    };

    protected nextMessage(): Message
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
                sub.partition === partition &&
                sub.channel === channel &&
                sub.address === address)
            {
                this.subscriptions.slice(this.subscriptions.indexOf(sub), 1);
                break;
            }
        }
    };

    protected dispatchMessage(message:Message)
    {
        for(let sub of this.subscriptions)
        {
            if ((sub.partition == null ||
                 message.partition == null ||
                 sub.partition === message.partition) &&
                (sub.channel == null ||
                 message.channel == null ||
                 sub.channel === message.channel) &&
                (sub.address == null ||
                 message.address == null ||
                 sub.address === message.address))
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

    public processAll()
    {
        let message = this.nextMessage();
        while(message != null)
        {
            this.dispatchMessage(message);
            message = this.nextMessage();
        }
    }
};
