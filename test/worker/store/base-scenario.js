class BaseScenario {
    constructor()
    {
        this.name = "Scenario";
        
        this.DEFAULT_TIMEOUT_MS = 30000;
        this.timeout = null;
        this.root_promise = null;
        this.root_start = null;
        
        this.pass = null;
        this.fail = null;
        this.line_callback = null;
        this.results = [];
    }

    first()
    {
        this.root_promise = new Promise((resolve, reject) => this.root_start = resolve);
        return this.root_promise;
    }
    
    // Must Implement, returns Execution Promise
    run()
    {
        return new Promise((resolve, reject) => {
            this.timeout = setTimeout(() => reject("Test Timed out (" + (this.DEFAULT_TIMEOUT_MS / 1000) + ")"), this.DEFAULT_TIMEOUT_MS);
            this.pass = resolve;
            this.fail = reject;
            this.root_start(); // resolves the root promise and starts the chain
        });
    }

    passTest(name, asserts = 1)
    {
        this.results.push({
            name: name,
            classname: this.name,
            assertions: asserts,
            status: "passing",
            finished: new Date().getTime()
        });
    }

    failTest(name, messages, asserts = -1)
    {
        if (asserts < 0)
        {
            asserts = messages.length;
        }
        this.results.push({
            name: name,
            classname: this.name,
            status: "failed",
            assertions: asserts,
            messages: messages,
            finished: new Date().getTime()
        });
    }

    end()
    {
        clearTimeout(this.timeout);
        this.pass(this.results);
    }
};

exports.BaseScenario = BaseScenario;
