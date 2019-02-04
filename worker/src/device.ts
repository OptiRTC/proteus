import { TestComponent} from "common/testcomponents";
import { TestCaseResults } from "common/result";

export interface Device
{
    runTest(test:TestComponent): Promise<TestCaseResults>;
    abortTest();
};
