
const ParticleScenario = require('./particle-scenario').ParticleScenario;

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

    run(metadata)
    {
        this.last_event = this.last_event
        .then(() => this.dfuMode())
        .then(() => this.flashCmd(metadata.binary))
        .then(() => this.openSerial())
        .then(() => this.waitForLine((data) => {
            return data === "Ready";
        }))
        .then(() => this.writeSerial(new Buffer.from("t\r\n", "ascii")))
        .then(() => this.getTestResults())
        .catch(e => this.error(e));
        return super.run(metadata);
    }

    getTestResults()
    {
        return this.waitForLine((data) => {
                let message = this.assertion_regex.exec(data);
                if (message != null)
                {
                    this.assertions.push(data);
                    return false;
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
                    return false;
                }
                message = this.summary_regex.exec(data);
                if (message != null)
                {
                    this.end();
                    return true;
                }
                return false;
            }, "Timed out waiting for test finish");
    }
};

exports.scenario = new SparkUnitTestScenario();
