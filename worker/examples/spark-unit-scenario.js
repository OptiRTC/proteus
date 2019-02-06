
const ParticleScenario = require('./particle-scenario');

class SparkUnitTestScenario extends ParticleScenario {
    constructor()
    {
        super();
        this.name = "Spark Unit Test Scenario";
        this.assertion_regex = new RegExp(/^Assertion\s(.+)\:\s(.+)/);
        this.test_regex = new RegExp(/^Test\s([A-Za-z0-9_]+)\s([a-z]+)\./);
        this.summary_regex = new RegExp(/^Test\ssummary\:\s([0-9]+)\spassed,\s([0-9]+)\sfailed,\sand\s([0-9]+)\sskipped,\sout\sof\s([0-9]+)\stest\(s\)\./);
    }
    
    getTestResults()
    {
        return this.waitForLine(() => {
                let message = this.assertion_regex.exec(data);
                if (message != null)
                {
                    this.assertions.push(data);
                    return;
                }
                message = this.test_regex.exec(data);
                if (message != null)
                {
                    let res = new Result({
                        name: message[1],
                        classname: this.binary,
                        status: message[2] == "failed" ? TestStatus.FAILED : TestStatus.PASSING,
                        assertions: 1,
                        finished: new Date().getTime(),
                        messages: this.assertions
                    });
                    if (message[2] == "failed")
                    {
                        this.testcase.failed.push(res);
                    } else {
                        this.testcase.passing.push(res);
                    }
                    return;
                }
                message = this.summary_regex.exec(data);
                if (message != null)
                {
                    clearTimeout(this.timeout);
                    resolve();
                    return;
                }

            }, "Did not get valid test string");
    }
};

exports.default = new SparkUnitTestScenario();
