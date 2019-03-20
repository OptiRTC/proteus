import { WorkerState, Worker } from 'common/worker';
import { Platforms } from 'common/platforms';
import { Message, TransportClient, MessageTransport } from 'common/messagetransport';
import { Partitions, WorkerChannels } from 'common/protocol';
import { Task } from 'common/task';

test('Responds to heartbeat', () =>{
	let transport = new MessageTransport();
	let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
	expect(worker.heartbeat).toEqual(0);
	transport.sendMessage(Partitions.WORKERS, WorkerChannels.HEARTBEAT, worker.id, null);
	transport.processAll();
	expect(worker.heartbeat).toBeGreaterThan(0);
});

test('Worker becomes online after discovery', () => {
	let transport = new MessageTransport();
	let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
	expect(worker.state).toEqual(WorkerState.OFFLINE);
	transport.sendMessage(Partitions.WORKERS, WorkerChannels.CONFIG, worker.id, {'pool_id': 'default'});
	expect(worker.state).toEqual(WorkerState.IDLE);
});

test('Heartbeat elapse sets offline status', () =>{
	let transport = new MessageTransport();
	let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
	transport.sendMessage(Partitions.WORKERS, WorkerChannels.CONFIG, worker.id, {'pool_id': 'default'});
	expect(worker.states.toEqual(WorkerState.IDLE));
	worker.checkHeartbeat();
	expect(worker.state).toEqual(WorkerState.OFFLINE);
});

test('Responds to status', () =>{
	let transport = new MessageTransport();
	let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
	expect(worker.state).toEqual(WorkerState.OFFLINE);
	transport.sendMessage(Partitions.WORKERS, WorkerChannels.STATUS, worker.id, { 'state': WorkerState.BUSY });
	transport.processAll();
	expect(worker.state).toEqual(WorkerState.BUSY);
});

test('Sends task to client', () =>{
	class TaskListener implements TransportClient
	{
		public called:boolean;
		constructor() { this.called = false; }

		public onMessage(message:Message)
		{
			this.called = true;
		};
	};
	let listener = new TaskListener();
	let transport = new MessageTransport();
	transport.subscribe(listener, Partitions.WORKERS, WorkerChannels.TASK, null);
	let worker = new Worker("0", "default", Platforms.ELECTRON, transport);
	worker.setTask(new Task({
		build: "test",
		job_id: "0",
		worker_id: worker.id,
		platform: Platforms.ELECTRON,
		pool_id: "default",
		store_id: "tmp/store",
		test: null}));
	transport.processAll();
	expect(listener.called).toBe(true);
});
