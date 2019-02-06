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
            this.timeout = setTimeout(() => reject(), this.DEFAULT_TIMEOUT);
            this.pass = resolve;
            this.fail = reject;
            this.root_start(); // resolves the root promise and starts the chain
        });
    }
};

exports.default = BaseScenario;
