import { Result } from "result";

export class TestComponent {
    constructor(
        public name:string, // Friendly name
        public binary:string, // The binary under test
        public scenario:string, // The scenario file to load (may be null for uint tests)
        public expectations:string[]) // A list of expectations (may be null for scenarios)
    {};

    getSkipped(results:Result[]): string[] {
        return this.expectations.filter(expectation => results.findIndex(result => expectation == result.name) != -1);
    };
};
