export var Partitions;
(function (Partitions) {
    Partitions["JOBS"] = "jobs";
    Partitions["POOLS"] = "pools";
    Partitions["WORKERS"] = "workers";
    Partitions["TASKS"] = "tasks";
    Partitions["SYSTEM"] = "system";
    Partitions["ADAPTER"] = "adapter";
})(Partitions || (Partitions = {}));
;
export var WorkerChannels;
(function (WorkerChannels) {
    WorkerChannels["STATUS"] = "status";
    WorkerChannels["TASK"] = "task";
    WorkerChannels["HEARTBEAT"] = "heartbeat";
    WorkerChannels["CONFIG"] = "config";
    WorkerChannels["DISCOVER"] = "discover";
    WorkerChannels["QUERY"] = "query";
})(WorkerChannels || (WorkerChannels = {}));
;
export var JobChannels;
(function (JobChannels) {
    JobChannels["RESULT"] = "result";
    JobChannels["STATUS"] = "status";
    JobChannels["START"] = "start";
    JobChannels["ABORT"] = "abort";
    JobChannels["NEW"] = "new";
    JobChannels["QUERY"] = "query";
})(JobChannels || (JobChannels = {}));
;
export var TaskChannels;
(function (TaskChannels) {
    TaskChannels["RESULT"] = "result";
    TaskChannels["ABORT"] = "abort";
    TaskChannels["STATUS"] = "status";
    TaskChannels["QUERY"] = "query";
})(TaskChannels || (TaskChannels = {}));
;
export var PoolChannels;
(function (PoolChannels) {
    PoolChannels["STATUS"] = "status";
    PoolChannels["QUERY"] = "query";
    PoolChannels["TASK"] = "task";
})(PoolChannels || (PoolChannels = {}));
;
export var AdapterChannels;
(function (AdapterChannels) {
    AdapterChannels["STORAGEREADY"] = "storageready";
    AdapterChannels["RESULT"] = "result";
    AdapterChannels["STATUS"] = "status";
    AdapterChannels["QUERY"] = "query";
})(AdapterChannels || (AdapterChannels = {}));
;
export var SystemChannels;
(function (SystemChannels) {
    SystemChannels["STORAGE"] = "storage";
    SystemChannels["RELEASESTORAGE"] = "releasestorage";
})(SystemChannels || (SystemChannels = {}));
;
//# sourceMappingURL=protocol.js.map