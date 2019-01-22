import { TransportClient, MessageTransport, Message } from "messagetransport";
import { Partitions } from "protocol";

class DummySubscriber implements TransportClient
{
    public message_count:number;

    constructor()
    {
        this.message_count = 0;
    };

    public onMessage(message:Message)
    {
        this.message_count += 1;
    };
};

test('MessageTransport', ()=>{
    let transport = new MessageTransport();
    let sub = new DummySubscriber();

    transport.subscribe(sub, Partitions.SYSTEM, "test", '0');
    // Broadcast message should hit all targets
    transport.sendMessage(new Message(null, null, null, null));
    expect(sub.message_count).toBe(1);
    // Out of band messages should miss
    transport.sendMessage(new Message(Partitions.JOBS, null, null, null));
    expect(sub.message_count).toBe(1);
    transport.sendMessage(new Message(Partitions.SYSTEM, "test", '1', null));
    expect(sub.message_count).toBe(1);
    // Narrow Partition-channel is in-band
    transport.sendMessage(new Message(Partitions.SYSTEM, "test", null, null));
    expect(sub.message_count).toBe(2);
    // Narrow Partition-id is in-band
    transport.sendMessage(new Message(Partitions.SYSTEM, null, '0', null));
    expect(sub.message_count).toBe(3);
    // Narrow channel-id is in-band
    transport.sendMessage(new Message(null, "test", '0', null));
    expect(sub.message_count).toBe(4);
    // Channels are out of band
    transport.sendMessage(new Message(Partitions.SYSTEM, "other", '0', null));
    expect(sub.message_count).toBe(4);    
});

test('End-to-End Object Transport', ()=> {
    let test_object = { number: 0, "str": "str", "array": ["a", "b", "c"]};
    let transport = new MessageTransport();
    class EqualitySubscriber implements TransportClient {
        public onMessage(message:Message)
        {
            expect(message.content.number).toEqual(test_object.number);
            expect(message.content["str"]).toEqual("str");
            expect(message.content["array"]).toEqual(["a", "b", "c"]);
        };
    };
    let sub = new EqualitySubscriber();
    transport.subscribe(sub, Partitions.SYSTEM, "test", '0');
    transport.sendMessage(new Message(Partitions.SYSTEM, "test", '0', test_object));
});
