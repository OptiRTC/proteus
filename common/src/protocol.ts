
export enum Partitions {
	WORKERS = "workers",
	TASKS = "tasks",
	SYSTEM = "system"
};

export enum WorkerChannels {
	STATUS = "status",
	TASK = "task",
	HEARTBEAT = "heartbeat",
	CONFIG = "config",
	DISCOVER = "discover",
	ACCEPT = "accept",
	REJECT = "reject",
	ABORT = "abort",
	ERROR = "error"
};

export enum TaskChannels {
	RESULT = "result",
	ABORT = "abort",
	STATUS = "status",
	QUERY = "query",
	ERROR = "error"
};

export enum SystemChannels {
	QUERY = "query",
	INFO = "info",
	START = "start",
	ERORR = "error",
	LOG = "log"
};
