const config = require('config');

class TestScenario {
    constructor()
    {
        this.name = "Test Scenario";
        this.DEFAULT_TIMEOUT = config.get('Worker.timeout');
        this.timeout = null;
        this.root_promise = null;
        this.root_start = null;
        this.messages = ["Well", "hello", "there"];
        this.port = null;
        this.pass = null;
        this.fail = null;
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

    // Example block
    getMessage(msg)
    {
        return new Promise((resolve, reject) =>
        {
            let input = this.messages.shift();
            if (input == msg)
            {
                resolve();
                return;
            }
            reject("Message unexpected");
        });
    }

    getRegex(test)
    {
        return new Promise((resolve, reject) =>
        {
            let msg = this.messages.shift();
            let match = test.exec(msg);
            if (match != null)
            {
                resolve(match);
                return;
            }
            reject("Regex not matched");
        });
    }

    getState(expected_state)
    {
        return new Promise((resolve, reject) =>
        {
            let msg = this.messages.shift();
           
            let device_state = this.parseDeviceState(msg);
            for(let key in expected_state)
            {
                if (expected_state[key] != device_state[key])
                {
                    reject("Device State did not match");
                    return;
                }    
            }
            resolve(device_state);
        });
    }

    parseDeviceState(message)
    {
        return { propertyname: message };
    }

    finish()
    {
        this.pass();
    }
};

const defaultTest = new TestScenario();
// Build promise chain
defaultTest.first().then(() =>
    defaultTest.getMessage("Well").then(() =>
    defaultTest.getRegex(/hello/).then(() =>
    defaultTest.getState({ propertyname: "there"}).then(() =>
    defaultTest.finish()))));

var exports = module.exports = defaultTest;
