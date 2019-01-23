import { WorkerState, Worker } from 'worker';
import { Platforms } from 'platforms';
import { Message, MessageTransport } from 'messagetransport';
import { Partitions, WorkerChannels } from 'protocol';
import { Task } from 'task';
test('Responds to heartbeat', () => {
    let transport = new MessageTransport();
    let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
    expect(worker.heartbeat).toEqual(0);
    transport.sendMessage(new Message(Partitions.WORKERS, WorkerChannels.HEARTBEAT, worker.id, null));
    transport.processAll();
    expect(worker.heartbeat).toBeGreaterThan(0);
});
test('Heartbeat elapse sets offline status', () => {
    let transport = new MessageTransport();
    let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
    expect(worker.state).toEqual(WorkerState.IDLE);
    worker.checkHeartbeat();
    expect(worker.state).toEqual(WorkerState.OFFLINE);
});
test('Responds to status', () => {
    let transport = new MessageTransport();
    let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
    expect(worker.state).toEqual(WorkerState.IDLE);
    transport.sendMessage(new Message(Partitions.WORKERS, WorkerChannels.STATUS, worker.id, { 'state': WorkerState.BUSY }));
    transport.processAll();
    expect(worker.state).toEqual(WorkerState.BUSY);
});
test('Sends task to client', () => {
    class TaskListener {
        constructor() { this.called = false; }
        onMessage(message) {
            this.called = true;
        }
        ;
    }
    ;
    let listener = new TaskListener();
    let transport = new MessageTransport();
    transport.subscribe(listener, Partitions.WORKERS, WorkerChannels.TASK, null);
    let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
    worker.setTask(new Task("test", "0", worker.id, Platforms.ELECTRON, "default", "tmp/store", null));
    transport.processAll();
    expect(listener.called).toBe(true);
});
//# sourceMappingURL=worker.test.js.map