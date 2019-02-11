const config = require('config');

class BaseScenario {
    constructor()
    {
        this.name = "Scenario";
        
        this.DEFAULT_TIMEOUT = config.get('Worker.timeout');
        this.timeout = null;
        this.root_promise = null;
        this.root_start = null;
        
        this.pass = null;
        this.fail = null;
        this.line_callback = null;
        this.results = [];
        this.metadata = null;
    }

    first()
    {
        this.root_promise = new Promise((resolve, reject) => this.root_start = resolve);
        return this.root_promise;
    }
    
    // Must Implement, returns Execution Promise
    run(metadata)
    {
        this.metadata = metadata;
        return new Promise((resolve, reject) => {
            this.timeout = setTimeout(() => reject(), this.DEFAULT_TIMEOUT);
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

exports.default = BaseScenario;
