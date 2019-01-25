;
export function ArrayToJSON(input) {
    return input.map((item) => item.toJSON());
}
;
export function ArrayFromJSON(ctor, input) {
    return input.map((item) => {
        return new ctor().fromJSON(item);
    });
}
;
export class Message {
    constructor(partition, channel, address, content) {
        this.partition = partition;
        this.channel = channel;
        this.address = address;
        this.content = content;
    }
    ;
}
;
class DispatchSubscription {
    constructor(reciever, partition, channel, address) {
        this.reciever = reciever;
        this.partition = partition;
        this.channel = channel;
        this.address = address;
    }
}
;
;
// Abstract PUB/SUB and API transport
export class MessageTransport {
    constructor() {
        this.subscriptions = [];
        this.queue = [];
    }
    sendMessage(partition, channel, address, content) {
        // Loopback
        this.recieveMessage(partition, channel, address, content);
    }
    ;
    recieveMessage(partition, channel, address, content) {
        this.queue.push(new Message(partition, channel, address, content));
    }
    ;
    nextMessage() {
        if (this.queue.length > 0) {
            return this.queue.shift();
        }
        return null;
    }
    ;
    subscribe(reciever, partition, channel, address) {
        this.subscriptions.push((new DispatchSubscription(reciever, partition, channel, address)));
    }
    ;
    unsubscribe(reciever, partition, channel, address) {
        for (let sub of this.subscriptions) {
            if (sub.reciever == reciever &&
                sub.partition == partition &&
                sub.channel == channel &&
                sub.address == address) {
                this.subscriptions.slice(this.subscriptions.indexOf(sub), 1);
                break;
            }
        }
    }
    ;
    dispatchMessage(message) {
        for (let sub of this.subscriptions) {
            if ((sub.partition == null ||
                message.partition == null ||
                sub.partition == message.partition) &&
                (sub.channel == null ||
                    message.channel == null ||
                    sub.channel == message.channel) &&
                (sub.address == null ||
                    message.address == null ||
                    sub.address == message.address)) {
                sub.reciever.onMessage(message);
            }
        }
    }
    ;
    process() {
        let message = this.nextMessage();
        if (message != null) {
            this.dispatchMessage(message);
        }
    }
    ;
    processAll() {
        let message = this.nextMessage();
        while (message != null) {
            this.dispatchMessage(message);
            message = this.nextMessage();
        }
    }
}
;
//# sourceMappingURL=messagetransport.js.map