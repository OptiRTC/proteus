import { Message } from "messagetransport";
import { UniqueID } from "uniqueid";
import { Partitions, WorkerChannels } from "protocol";
export var WorkerState;
(function (WorkerState) {
    WorkerState[WorkerState["IDLE"] = 0] = "IDLE";
    WorkerState[WorkerState["BUSY"] = 1] = "BUSY";
    WorkerState[WorkerState["OFFLINE"] = 2] = "OFFLINE";
    WorkerState[WorkerState["ERROR"] = 3] = "ERROR";
})(WorkerState || (WorkerState = {}));
;
export class Worker extends UniqueID {
    constructor(name, pool, platform, transport, timeout = 180) {
        super();
        this.name = name;
        this.pool = pool;
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
                this.state = message.content['state'];
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
        this.transport.sendMessage(new Message(Partitions.WORKERS, WorkerChannels.TASK, this.id, task));
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