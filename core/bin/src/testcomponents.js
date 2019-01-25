export class TestComponent {
    constructor(content) {
        if (content) {
            this.fromJSON(content);
        }
        else {
            this.name = null;
            this.binary = null;
            this.scenario = null;
            this.expectations = [];
        }
    }
    ;
    getSkipped(results) {
        let skipped = this.expectations.filter(expectation => results.findIndex(result => expectation == result.name) == -1);
        return skipped;
    }
    ;
    toJSON() {
        // No nested classes
        return {
            name: this.name,
            binary: this.binary,
            scenario: this.scenario,
            expectations: this.expectations
        };
    }
    ;
    fromJSON(content) {
        this.name = typeof (content.name) == 'undefined' ? "NAMEERROR" : content.name;
        this.binary = typeof (content.binary) == 'undefined' ? "NAMEERROR" : content.binary;
        this.scenario = typeof (content.scenario) == 'undefined' ? "NAMEERROR" : content.scenario;
        this.expectations = typeof (content.expectations) == 'undefined' ? [] : content.expectations;
        return this;
    }
    ;
}
;
//# sourceMappingURL=testcomponents.js.map