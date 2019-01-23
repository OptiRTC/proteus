import { TestStatus, Result, TestCases } from 'result';
import { Task } from 'task';
import { Platforms } from 'platforms';
import { TestComponent } from 'testcomponents';
test('Skipped tests populated', () => {
    let task = new Task("test", "0", "0", Platforms.ELECTRON, "default", "0", new TestComponent("test", "test.bin", "test.js", [
        "PassedTest",
        "FailedTest",
        "SkippedTest"
    ]));
    let test_cases = new TestCases("0", [
        new Result("PassedTest", "PassedTest", TestStatus.PASSING, 1, new Date().getTime(), null)
    ], [
        new Result("FailedTest", "FailedTest", TestStatus.FAILED, 1, new Date().getTime(), ["failed!"])
    ], task);
    expect(test_cases.passing.length).toBe(1);
    expect(test_cases.failed.length).toBe(1);
    expect(test_cases.skipped.length).toBe(1);
    expect(test_cases.skipped[0].name).toEqual("SkippedTest");
});
//# sourceMappingURL=result.test.js.map