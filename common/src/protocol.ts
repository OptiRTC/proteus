
export enum Partitions {
	JOBS = "jobs",
	POOLS = "pools",
	WORKERS = "workers",
	TASKS = "tasks",
	SYSTEM = "system",
	ADAPTER = "adapter"
};

export enum WorkerChannels {
	STATUS = "status",
	TASK = "task",
	HEARTBEAT = "heartbeat",
	CONFIG = "config",
	DISCOVER = "discover",
	QUERY = "query",
	ACCEPT = "accept",
	REJECT = "reject",
	ABORT = "abort",
	ERROR = "error"
};

export enum JobChannels {
	RESULT = "result",
	STATUS = "status",
	START = "start",
	ABORT = "abort",
	NEW = "new",
	QUERY = "query"
};

export enum TaskChannels {
	RESULT = "result",
	ABORT = "abort",
	STATUS = "status",
	QUERY = "query"
};

export enum PoolChannels {
	STATUS = "status",
	QUERY = "query",
	TASK = "task"
};

export enum AdapterChannels {
	STORAGEREADY = "storageready",
	RESULT = "result",
	STATUS = "status",
	QUERY = "query"
};

export enum SystemChannels {
	STORAGE = "storage",
	RELEASESTORAGE = "releasestorage",
	QUERY = "query",
	INFO = "info",
	START = "start",
	STATUS = "status"
};
