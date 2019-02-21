class BaseScenario {
    constructor()
    {
        this.name = "Scenario";
        this.DEFAULT_TIMEOUT = (process.env.TIMEOUT || 300) * 1000;
        this.timeout = null;
        this.results = [];
        this.init = {};
        this.reject = null;
        this.resolve = null;
        this.last_event = null;
        this.run_promise = null;
        this.resetScenario();
    }

    resetScenario()
    {
        if (this.timeout != null) 
        {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.results = [];
        this.run_promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
        this.init = {};
        this.init.promise = new Promise((resolve, reject) => {
            this.init.resolve = resolve;
            this.init.reject = reject;
        });
        this.last_event = this.init.promise;

        this.run_promise.finally(() => this.resetScenario());
    }

    // Setup Promises here, easy to debug
    run(metadata)
    {
        this.timeout = setTimeout(() => this.reject("Timed out (" + this.DEFAULT_TIMEOUT + ")"), this.DEFAULT_TIMEOUT);
        this.init.resolve();
        return this.run_promise;
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
        this.resolve(this.results);
    }

    error(e)
    {
        console.log(e);
        this.reject(e);
    }


};

exports.BaseScenario = BaseScenario;
