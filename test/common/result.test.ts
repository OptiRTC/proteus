import { TestStatus, Result, TestCaseResults } from 'common:result';
import { Task } from 'common:task';
import { Platforms } from 'common:platforms';
import { TestComponent } from 'common:testcomponents';

test('Serialization', () => {
	let result = new Result({
		name: "res",
    	classname: "res",
    	status: TestStatus.PASSING,
    	assertions: 1,
    	finished: new Date().getTime(),
    	messages: []
	});
	let serial = result.toJSON();
	let result2 = new Result().fromJSON(serial);
	expect(result).toEqual(result2);

	let tc = new TestCaseResults({
		"worker_id": "0",
		passing: [],
		failed: [],
		skipped: [],
		task: new Task()
	});
	serial = tc.toJSON();
	let tc2 = new TestCaseResults().fromJSON(serial);
	expect(tc2).toEqual(tc);
});

test('Skipped tests populated', () => {
	let task = new Task({
		build: "test",
		job_id:"0",
		worker_id: "0",
		platform: Platforms.ELECTRON,
		pool_id: "default",
		storage_id: "0",
		test: new TestComponent({
			name: "test",
			classname: "test.bin",
			scenario: "test.js",
			expectations: [
				"PassedTest",
				"FailedTest",
				"SkippedTest"
			]})});
	let test_cases = new TestCaseResults({
		worker_id: "0",
		passing: [
			new Result({
				name: "PassedTest",
				classname: "PassedTest",
				status: TestStatus.PASSING,
				assertions: 1,
				timestamp: new Date().getTime(),
				task: task
			})
		],
		failed: [
			new Result({
				name: "FailedTest",
				classname: "FailedTest",
				status: TestStatus.FAILED,
				assertions: 1,
				timestamp: new Date().getTime(),
				task: task
			})
		],
		task: task});
	test_cases.populateSkipped();
	expect(test_cases.passing.length).toBe(1);
	expect(test_cases.failed.length).toBe(1);
	expect(test_cases.skipped.length).toBe(1);
	expect(test_cases.skipped[0].name).toEqual("SkippedTest");
});
