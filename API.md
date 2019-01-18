#Proteus API
Proteus is composed of a Core web server with a series of Worker web servers as subscribers. It exposes a json REST API to interact with and discover workers.
Workers must be initially pointed at the Core server to get appropriate configuration, after which the Core can update them by POSTing to /config on the worker (HTTP).
API accepts JSON, and will return JSON.
Partially implemented UI in HTML.

## Core API

### workers
**/workers**
Will give a list of all current workers, their status, and job IDs assigned to them.

**/workers/discover**
Maps a worker to a IP address. Workers are expected to call this when their IP changes.
A worker that changes address without updating the Core will be considered offline.

**/workers/config**
_{worker_id: 0}_
Expects a worker id in the body of the request. Will generate config if the worker_id does not exist or is zero, or return the latest json-encoded config if the worker is found in the database.

**/workers/`id`/**
Will return json-encoded information about the worker. At minimum it will include `worker_id`, `pool_id`, and `status`.
It may include a `task_id` if the worker is currently assigned a task.

**/workers/`id`/pool**
Will set the pool for a worker if POSTed to.
Will abort any tasks the worker is currently running.

**/workers/`id`/status**
Returns the state of a worker as IDLE, OFFLINE, ERROR, BUSY

**/workers/`id`/heartbeat**
Will return json-encoded heartbeat in seconds. If POSTed to will reset the heartbeat seconds. If a worker doesn't heartbeat every 5 minutes, it's considered offline.
Offline workers will not be assigned tasks.

**/workers/`id`/results**
POSTing a file to this url will associate the results with the task_id currently assigned to the worker.
Expects JUNIT XML to be uploaded. Filename format should follow the following convention:
`<endtime_utc>`_`<task_id>`_`<build_id>`.xml

### /jobs
**/jobs**
Will give a list of all current jobs, their status.

**/jobs/create**
Adds a new job to the queue. Accepts a json-encoded job description:
```
{
	"key": "", // optional key for CI, distinct from ID
	"adapter": "appveyor", // the CI adapter, can be LOCAL or any installed adapters
	"artifact_url": "", // URI containing all test binaries defaults to a temp dir if omitted
	"tests": {
		"filename": [] // Binary file : List of expected tests
	},
	"scenarios": [], // List of scenarios expected to be run
	"pool": "default", // default if omitted
	"platforms": [ "electron", "photon" ] // which platforms to run on
}
```
Will return the created job as a json-encoded structure.
Adds `id` and `status`, will populate `pool` with _"default"_ if omitted, and localize `artifact_url` with a tmp directory.
If `artifact_url` was a url to a zip file, it will be unzipped in the localized tmp directory.

**/jobs/`id`/**
Returns json-encoded information about the job (same format as /jobs/create)

**/jobs/`id`/artifact**
POSTing a file to this url will add the file to the localized `artifact_url`.

**/jobs/`id`/start**
Creates tasks for the platforms and them. Sets `status` for the job to running.


**/jobs/`id`/abort**
Cancels and cleans up resources for a job. Removes any locally cached artifacts and tasks.

**/jobs/`id`/results**
Enumerates XML files uploaded as results.
Parses JUNIT results on-page.

### /adapters
**/adapters**
Will give a list of installed adapters and their associated jobs.
Allows enable/disable of adapters

**/adapter/`id`/**
Allows configuring an adapter, setting keys and urls. Configuration is defined by the adapter component.
Check the adapter description for json shape.

### /tasks
**/tasks**
A list of tasks, with status and workers.

**/tasks/create**
Creates a task for a specific pool, platform, and binary.

**/tasks/`id`**
Shows the status of a task an the task parameters.
```
{
	"id": 0,
	"artifact_url": "somehost/dir",
	"test": "test.bin",
	"scenarios": "scenario.py",
	"expectations": ["Test1", "Test2"]
}
```

**/tasks/`id`/complete**
Completes a test with an array of result objects.
```
[{
	"name": "binname or scenarios name",
	"status": "pass/fail/skipped",
	"assert": "optional, assert text"
}]
```

### /pools
**/pools**
Gives a list of pools with their assigned workers.

**/pool/create**
Takes a unique name, returns id and name json-encoded.

**/pool/`id`/**
Shows load-balancing stats for and current status of a pool.

## Worker API

### /task/create
Accepts a JSON-encoded task. The worker may reject the task.
If it accepts it changes it's state to BUSY and downloads the binaries and scenario files it needs.

### /status
Returns json-encoded status, which can be one of IDLE, BUSY, ERROR.
An ERROR status should be manually serviced. IDLE and BUSY states will not have new tasks queued to them.

### /config
POSTing config here will change the worker config. A GET will return the current config cached on device.
```
{
	"worker_id": 0,
	"name": "Friendly name",
	"pool_id": 0,
	"proteus_server": "somehost.domain",
	"proteus_port": 3000,
	"worker_address": "<ip of worker>"
}
```
