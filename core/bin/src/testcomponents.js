export class TestComponent {
    constructor(name, // Friendly name
    binary, // The binary under test
    scenario, // The scenario file to load (may be null for uint tests)
    expectations) {
        this.name = name;
        this.binary = binary;
        this.scenario = scenario;
        this.expectations = expectations;
    }
    ;
    getSkipped(results) {
        return this.expectations.filter(expectation => results.findIndex(result => expectation == result.name) != -1);
    }
    ;
}
;
//# sourceMappingURL=testcomponents.js.map