import { Result } from "common/result";
import { Transportable } from 'common/messagetransport';

export class TestComponent implements Transportable {
    
        public name:string; // Friendly name
        public binary:string; // The binary under test
        public scenario:string; // The scenario file to load (may be null for uint tests)
        public expectations:string[]; // A list of expectations (may be null for scenarios)

    constructor(content?:any)
    {
        if (content)
        {
            this.fromJSON(content);
        } else {
            this.name = null;
            this.binary = null;
            this.scenario = null;
            this.expectations = [];
        }
    };

    public getSkipped(results:Result[]): string[] {
        let skipped = this.expectations.filter(
            expectation => 
                results.findIndex(result => 
                    expectation == result.name) == -1);
        return skipped;
    };

    public toJSON():any
    {
        // No nested classes
        return {
            name: this.name,
            binary: this.binary,
            scenario: this.scenario,
            expectations: this.expectations
        };
    };

    public fromJSON(content:any): TestComponent
    {
        this.name = typeof(content.name) == 'undefined' ? "NAMEERROR": content.name;
        this.binary = typeof(content.binary) == 'undefined' ? "NAMEERROR" : content.binary;
        this.scenario = typeof(content.scenario) == 'undefined' ? "NAMEERROR" : content.scenario;
        this.expectations = typeof(content.expectations) == 'undefined' ? [] : content.expectations;
        return this;
    };
};
