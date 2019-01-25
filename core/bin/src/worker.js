import { Partitions, WorkerChannels } from "protocol";
export var WorkerState;
(function (WorkerState) {
    WorkerState[WorkerState["IDLE"] = 0] = "IDLE";
    WorkerState[WorkerState["BUSY"] = 1] = "BUSY";
    WorkerState[WorkerState["OFFLINE"] = 2] = "OFFLINE";
    WorkerState[WorkerState["ERROR"] = 3] = "ERROR";
})(WorkerState || (WorkerState = {}));
;
export class Worker {
    constructor(id, pool_id, platform, transport, timeout = 180) {
        this.id = id;
        this.pool_id = pool_id;
        this.platform = platform;
        this.transport = transport;
        this.timeout = timeout;
        this.transport.subscribe(this, Partitions.WORKERS, null, this.id);
        this.state = WorkerState.IDLE;
        this.heartbeat = 0;
        this.task = null;
    }
    ;
    onMessage(message) {
        switch (message.channel) {
            case WorkerChannels.HEARTBEAT:
                this.heartbeat = new Date().getTime();
                break;
            case WorkerChannels.STATUS:
                this.state = message.content.state in WorkerState ? message.content.state : WorkerState.ERROR;
                break;
            default:
                break;
        }
    }
    ;
    setTask(task) {
        this.state = WorkerState.BUSY;
        this.task = task;
        this.task.started = new Date().getTime();
        this.task.worker_id = this.id;
        this.transport.sendMessage(Partitions.WORKERS, WorkerChannels.TASK, this.id, task.toJSON());
    }
    ;
    destroy() {
        this.transport.unsubscribe(this, Partitions.WORKERS, null, this.id);
    }
    ;
    finish() {
        this.state = WorkerState.IDLE;
        this.task = null;
    }
    ;
    checkHeartbeat() {
        if ((new Date().getTime() - this.heartbeat) > this.timeout) {
            this.state = WorkerState.OFFLINE;
        }
    }
    ;
}
;
//# sourceMappingURL=worker.js.map