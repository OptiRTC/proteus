
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
	QUERY = "query",
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
	STORAGE = "storage",
	RELEASESTORAGE = "releasestorage",
	QUERY = "query",
	INFO = "info",
	START = "start",
	ERORR = "error"
};
