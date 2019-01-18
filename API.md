#Proteus API
Proteus is composed of a Core web server with a series of Worker web servers as subscribers. It exposes a json REST API to interact with and discover workers.
Workers must be initially pointed at the Core server to get appropriate configuration, after which the Core can update them by POSTing to /config on the worker (HTTP).
API accepts JSON, and will return JSON.
Partially implemented UI in HTML.

## **/** (Root Domain)
The root domain provides a html dashboard with summary information.
System load, task throughput average, message throughput average, current queue sizes, worker status.
It also provides links to
- Adapter Control
- Job Control
- Pool Control
- Worker Control
- Task Control
- System Control

## **/adapters**
A html dashboard or json array of all adapters. Allows drill-down into a specific adapter.
Adapter data model:
```
{
	adapter_name: string,
	adapter_config: {},
	enabled: boolean,
	total_jobs: int,
	average_jobs: int,
	reserved_storage: [storage],
	queued_jobs: [job],
	active_jobs: [job],
	finished_jobs: [job]
}
```
### **/adapters/`id`**
The html dashboard or json blob for a specific adapter. html dashboard displays
- Total Jobs
- Average Jobs/day
- Active storage elements
- List of Queued Jobs
- List of Active Jobs
- List of Finished Jobs

### **/adapters/`id`/enable**
Enables or disables an adapter when posted to. Expects a json object.
```
{
	enable: boolean
}
```

## **/jobs**
A job represents a collection of task-definitions, expected-results, and adapter-association. A job belongs to an adapter. Job data model:
```
{
	name: string,
	adapter: adapter,
	tasks: [task],
	started: int,
	finished: int or null,
	error_count: int,
	status: QUEUED | RUNNING | FINISHED | ERROR,
	platform: string,
	pool: string
}
```

### **/jobs/`id`**
The html dashboard or json blob for a specific job. html dashboard displays
- Job Status
- Run Time
- List of Complete Tasks
- List of Queue Tasks
- List of Running Tasks

### **/jobs/`id`/abort**
Aborts a job: Dequeues all tasks, halts all workers associated with a job, reports partial results if possible.

## **/pools**
A html dashboard or json object listing all pools. A pool is a logical collection of workers. Pools can include workers for any platform, and should be used to reserve workers for a specific workflow or test type. For example: Unit Tests, Release Testing, Long-running Integrity Tests. Pool data model:
```
{
	name: string,
	workers: [worker],
	jobs: [job]
}
```

## **/pools/`id`**
The html dashboard or json blob for a specific poll. html dashboard displays
- Pool Status
- Worker Summary List
- Job-Task Queue Length

## **/workers**
A html dashboard or json object listing all workers. A worker is a logical represetation of a physical worker (remote or local) and syncs with that physical worker via a communication channel. It holds the last known state of a physical worker, and is responsible for detecting a persistent error state on the worker. Worker data model:
```
{ 
	id: string,
	name: string,
	pool: string,
	platform: string,
	status: ERROR|IDLE|BUSY|DISABLED,
	task: task,
	current_uptime: int,
	error_count: int,
	total_task_count: int,
	heartbeat: int
}
```
**/workers/discover**
Maps a worker to a IP address. Workers are expected to call this when their IP changes.
A worker that changes address without updating the Core will be considered offline. A worker will POST to this endpoint with basic information about itself. This should return a JSON object filling in any missing data.
```
{
	id: string,
	status: ERROR|IDLE|BUSY|DISABLED,
	platform: string,
	error_count: int,
	name: string, //optional
	pool: string, //optional
}
```

**/workers/`id`/**
Will return json-encoded information about the worker or a html dashboard showing current worker status and allowing config. Allows assigning name, pool, and platform. Lists:
- Worker Status
- Job-Task
- Heartbeat
- Error Count

## **/tasks**
A task is a unit of work to be performed and instructions on how to find and obtain the files associated with it. Task data model:
```
{
	name: string,
	storage: storage,
}
```

## **/system**
The system model represents various settings for proteus. System data model:
```
{
	storage_root: string,
	public_url: string,
	uptime: int,
	config_path: string,
	log_path: string
}
```

## Misc Models
A list of data models not otherwise covered. These are mostly utility items

### Job-Task
Relates a job and a task. Job-Task data model:
```
{
	job: job,
	task: task
}
```

### Storage
Maps Proteus storage to an HTTP, SFTP, FTP, or other method of retreaval. Storage data model:
```
{
	job: job,
	path: string,
	uri: string
}
```

### Worker-Task
Maps a worker to a task. Worker-Task data model:
```
{
	worker: worker,
	task: task
}
```
