
const ParticleScenario = require('./particle-scenario');

class SparkUnitTestScenario extends ParticleScenario {
    constructor()
    {
        super();
        this.name = "Spark Unit Test Scenario";
        this.assertions = [];
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
                    if (message[2] == "failed")
                    {
                        this.failTest(message[1], this.assertions);
                    } else {
                        this.passTest(message[1]);
                    }
                    return;
                }
                message = this.summary_regex.exec(data);
                if (message != null)
                {
                    this.end();
                    return;
                }

            }, "Did not get valid test string");
    }
};

exports.default = new SparkUnitTestScenario();
