import {Message,MessageTransport} from "./messagetransport";

class DispatchSubscription
{
    constructor(
        public reciever:any,
        public partition:string,
        public channel:string,
        public address:string)
    {}
};

export class Dispatcher
{
    private subscriptions:DispatchSubscription[];
    constructor(public transport:MessageTransport)
    {}

    subscribe(reciever:any, partition:string, channel:string, address:string)
    {
        this.subscriptions.push((new DispatchSubscription(
            reciever,
            partition,
            channel,
            address)));
    }

    unsubscribe(reciever:any, partition:string, channel:string, address:string)
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
    }

    dispatch(message:Message)
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
};
