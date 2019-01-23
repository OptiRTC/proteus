import { TestComponent } from 'testcomponents';
import { TestStatus, Result } from 'result';

test('getSkipped', () => {
	let test = new TestComponent(
		"test",
		"test.bin",
		"scen.js",
		[
			"A",
			"B",
			"C"
		]);
	let res = new Result("B", "B", TestStatus.PASSING, 1, 0, null);
	let skipped = test.getSkipped([res]);
	expect(skipped).toEqual(["A", "C"]);
});
