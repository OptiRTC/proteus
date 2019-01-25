import { MessageTransport } from "messagetransport";
import { Job } from "job";
import { Platforms } from "platforms";
import { TestComponent } from "testcomponents";
import { Pool } from "pool";
import { Partitions, JobChannels, AdapterChannels, TaskChannels } from "protocol";
import { TestCaseResults } from "result";
function TestTests() {
    return [
        new TestComponent({
            name: "test",
            binary: "test.bin",
            scenario: "test.js",
            expectations: ["A", "B", "C"]
        }),
        new TestComponent({
            name: "test2",
            binary: "test2.bin",
            scenario: "test2.js",
            expectations: ["A", "B", "C"]
        })
    ];
}
function TestJob(transport) {
    return new Job(transport, "test", "test", [Platforms.ELECTRON, Platforms.PHOTON], new Pool("default", transport, 180).id, "tmp/test", TestTests());
}
;
test('tasks count is product of tests and platforms', () => {
    class JobTaskCounter {
        constructor() {
            this.taskcount = 0;
        }
        onMessage(message) {
            this.taskcount = message.content.tasks.length;
        }
        ;
    }
    ;
    let listener = new JobTaskCounter();
    let transport = new MessageTransport();
    let job = TestJob(transport);
    transport.subscribe(listener, Partitions.JOBS, JobChannels.STATUS, null);
    job.start();
    transport.sendMessage(Partitions.JOBS, JobChannels.QUERY, job.id, null);
    transport.processAll();
    expect(listener.taskcount).toBe(2 * 2);
});
test('Abort message cancels pending tasks and fails tests', done => {
    class StatusListener {
        constructor() {
            this.called = false;
        }
        ;
        onMessage(message) {
            this.called = true;
            expect(message.content.tasks.length).toBe(4);
            expect(message.content.results.length).toBe(4);
            done();
        }
        ;
    }
    ;
    let listener = new StatusListener();
    let transport = new MessageTransport();
    let job = TestJob(transport);
    job.start();
    transport.processAll();
    job.abort();
    transport.processAll();
    transport.subscribe(listener, Partitions.JOBS, JobChannels.STATUS, null);
    transport.sendMessage(Partitions.JOBS, JobChannels.QUERY, job.id, null);
    transport.processAll();
    expect(listener.called).toBe(true);
}, 160000);
test('logResults sends to adapter', () => {
    class ResultsListener {
        constructor() {
            this.called = false;
        }
        ;
        onMessage(message) {
            this.called = true;
            expect(message.content.length).toBe(4);
        }
        ;
    }
    ;
    let listener = new ResultsListener();
    let transport = new MessageTransport();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.RESULT, null);
    let job = TestJob(transport);
    job.start();
    transport.processAll();
    job.abort();
    transport.processAll();
    transport.processAll();
    expect(listener.called).toBe(true);
});
test('Job Completes when all tasks run', () => {
    class DummyPool extends Pool {
        dummy_flipTasks() {
            while (this.queued_tasks.length > 0) {
                this.active_tasks.push(this.queued_tasks.shift());
            }
            for (let task of this.active_tasks) {
                this.transport.sendMessage(Partitions.TASKS, TaskChannels.RESULT, task.id, new TestCaseResults({
                    worker_id: 'dummy',
                    passing: [],
                    failed: [],
                    task: task
                }));
            }
        }
        ;
    }
    ;
    class AdapterListener {
        constructor() {
            this.called = false;
        }
        onMessage(message) {
            this.called = true;
        }
        ;
    }
    ;
    let transport = new MessageTransport();
    let listener = new AdapterListener();
    transport.subscribe(listener, Partitions.ADAPTER, AdapterChannels.RESULT, null);
    let pool = new DummyPool("default", transport, 180);
    let job = new Job(transport, "test", "test", [Platforms.ELECTRON, Platforms.PHOTON], pool.id, "tmp/test", TestTests());
    job.start();
    transport.processAll();
    pool.dummy_flipTasks();
    transport.processAll();
    expect(listener.called).toBe(true);
});
//# sourceMappingURL=job.test.js.map