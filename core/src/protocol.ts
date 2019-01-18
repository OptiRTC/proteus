
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
	DISCOVER = "discover"
};

export enum JobChannels {
	RESULT = "result",
	STATUS = "status",
	START = "start",
	ABORT = "abort",
	NEW = "new"
};

export enum TaskChannels {
	RESULT = "result",
	STATUS = "status"
};

export enum PoolChannels {
	STATUS = "status"
};

export enum AdapterChannels {
	BUILD = "build",
	RESULT = "result"
};
