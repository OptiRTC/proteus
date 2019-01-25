import { TestComponent } from 'testcomponents';
import { TestStatus, Result } from 'result';
test('Serializiaton', () => {
    let test = new TestComponent({
        name: "test",
        binary: "test.bin",
        scenario: "scen.js",
        expectations: [
            "A",
            "B",
            "C"
        ]
    });
    let serial = test.toJSON();
    let test2 = new TestComponent(serial);
    expect(test2).toEqual(test);
});
test('getSkipped', () => {
    let test = new TestComponent({
        name: "test",
        binary: "test.bin",
        scenario: "scen.js",
        expectations: [
            "A",
            "B",
            "C"
        ]
    });
    let res = new Result({
        name: "B",
        classname: "B",
        status: TestStatus.PASSING,
        assertions: 1,
        finished: 0,
        messages: null
    });
    let skipped = test.getSkipped([res]);
    expect(skipped).toEqual(["A", "C"]);
});
test('empty skipped', () => {
    let test = new TestComponent();
    test.fromJSON({
        test: "test",
        classname: "test.bin",
        scenario: "scen.js",
        expectiations: [
            "A",
            "B",
            "C"
        ]
    });
    let res = [
        new Result({
            name: "A",
            classname: "A",
            status: TestStatus.PASSING,
            assertions: 1,
            finished: 0,
            messages: null
        }),
        new Result({
            name: "B",
            classname: "B",
            status: TestStatus.FAILED,
            assertions: 1,
            finished: 0,
            messages: null
        }),
        new Result({
            name: "C",
            classname: "C",
            status: TestStatus.PASSING,
            assertions: 1,
            finished: 0,
            messages: null
        }),
    ];
    let skipped = test.getSkipped(res);
    expect(skipped).toEqual([]);
});
//# sourceMappingURL=testcomponents.test.js.map