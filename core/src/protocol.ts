
export enum Partitions {
	JOBS = "jobs",
	POOLS = "pools",
	WORKERS = "workers",
	TASKS = "tasks",
	SYSTEM = "system"
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
	ABORT = "abort"
};

export enum TaskChannels {
	RESULT = "result",
	STATUS = "status"
};

export enum PoolChannels {
	STATUS = "status"
};
