export class TestComponent {
    constructor(
        public name:string, // Friendly name
        public binary:string, // The binary under test
        public scenario:string, // The scenario file to load (may be null for uint tests)
        public expectations:string[]) // A list of expectations (may be null for scenarios)
    {};

    getSkipped(results:string[]): string[] {
        for(let expect in this.expectations)
        {
            for(let result in results)
            {
                if (expect == result)
                {
                    const index: number = results.indexOf(result, 0);
                    if (index > -1) {
                        results.splice(index, 1);
                    }
                }
            }
        }
        return results;
    };
};
