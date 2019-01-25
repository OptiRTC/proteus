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
    transport.sendMessage(null, null, null, null);
    transport.process();
    expect(sub.message_count).toBe(1);
    // Out of band messages should miss
    transport.sendMessage(Partitions.JOBS, null, null, null);
    transport.process();
    expect(sub.message_count).toBe(1);
    transport.sendMessage(Partitions.SYSTEM, "test", '1', null);
    transport.process();
    expect(sub.message_count).toBe(1);
    // Narrow Partition-channel is in-band
    transport.sendMessage(Partitions.SYSTEM, "test", null, null);
    transport.process();
    expect(sub.message_count).toBe(2);
    // Narrow Partition-id is in-band
    transport.sendMessage(Partitions.SYSTEM, null, '0', null);
    transport.process();
    expect(sub.message_count).toBe(3);
    // Narrow channel-id is in-band
    transport.sendMessage(null, "test", '0', null);
    transport.process();
    expect(sub.message_count).toBe(4);
    // Channels are out of band
    transport.sendMessage(Partitions.SYSTEM, "other", '0', null);
    transport.process();
    expect(sub.message_count).toBe(4);
});

test('End-to-End Object Transport', () => {
    let test_object = { number: 0, "str": "str", "array": ["a", "b", "c"]};
    let transport = new MessageTransport();
    class EqualitySubscriber implements TransportClient {
        public called:boolean;
        constructor()
        {
            this.called = false;
        }
        public onMessage(message:Message)
        {
            this.called = true;
            expect(message.content.number).toEqual(test_object.number);
            expect(message.content.str).toEqual("str");
            expect(message.content.array).toEqual(["a", "b", "c"]);
        };
    };
    let sub = new EqualitySubscriber();
    transport.subscribe(sub, Partitions.SYSTEM, "test", '0');
    transport.sendMessage(Partitions.SYSTEM, "test", '0', test_object);
    transport.process();
    expect(sub.called).toBe(true);
});
