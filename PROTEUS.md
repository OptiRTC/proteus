# Proteus Architecture

## Core
Core owns the following components
- A collection of adapters
- A collection of jobs
- A collection of pools
- A collection of workers
- A HTTP, FTP, or other file-delivery server
- A message channel to an MQTT broker

Core should pump messages and run an update loop for it's components.
Respecting the async io stack it should use setImmediate to achieve this.

## Adapter
An apater is owned by the core. Each adapter manages it's own state.
On update an adapter should do the following:
- Check for New Builds
- Reserve any needed storage
- Download or Copy and required files for testing
- Create a job using the reserved storage
- Add the job to the core
- Check all jobs for results, upload if finished

## Job
A job creates a set of tasks. It parses the tests.json that must be included in the build artifacts (to define a proteus test), and pairs a number of test results with expectations. It generates a series of descrete tasks from the test plan that can be executed by a worker.
The job maintains a queue of tasks, passing them to a pool when asked, as well as a set of in-progress work and completed tasks. When all tasks finish running with PASSED, FAILED, or ERROR states the job completes and passes a result set to it's parent adapter.

## Pool
A pool is a load-balancing logical grouping of workers. A pool accepts one or jobs and dispatches tasks to any idle workers it can find. It continues to dispatch tasks from the jobs associated with it until each task from a job is run, or until a task has failed to run 3 times.

## Worker
A worker is owned by a pool. The worker object is a logical representation of a physical worker. A worker will listen for changes in the state of it's physical counterpart. A worker is also responsible for communicating the detials of a task to it's physical counterpart.

# Task
A task describes how to run a test and recieves the results of that test. It generally describes a binary to run/stage, a test-execution script (javascript) and associated metadata to pass to that test-execution. A task owns it's results, and is considered complete when it obtains results.
