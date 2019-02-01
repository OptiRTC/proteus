const Gpio = require('onoff').Gpio;
const config = require('config');
const SerialPort = require('serialport');

// Promise chain
// first -> run

class TestScenario {
    constructor()
    {
        this.name = "Test Scenario";
        this.POWER_PIN = Gpio(config.get('GPIO.RST'), 'out');
        this.DEFAULT_TIMEOUT = config.get('Worker.timeout');
        this.timeout = null;
        this.root_promise = null;
        this.root_start = null;
        this.port = null;
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
            
            this.port = new SerialPort(config.get('Worker.port'),(e) => (this.onPortError(e)));
            this.port.open();
            const readline = new SerialPort.parsers.Readline({ delimiter: '\r\n' });
            readline.on('data', (data) => { if (this.line_callback != null) this.line_callback(data); });
            this.port.pipe(readline);
            this.root_start(); // resolves the root promise and starts the chain
        });
    }
    
    onPortError(e)
    {
        console.log(e);
        this.port.open();
    }

    setPower(state, time = 0)
    {
        return new Promise((resolve, reject) => {
            this.POWER_PIN.writeSync(state ? 1 : 0);
            if (time != 0)
            {
                let savedState = !state;
                setTimeout(() => {
                    this.setPower(savedState);
                    resolve();
                }, time);
            } else {
                resolve();
            }
        });
    }

    waitForInput(test, err = "waitForInput", timeout = this.DEFAULT_TIMEOUT)
    {
        return new Promise((resolve, reject) => {
            let expire = setTimeout(() => reject("Timeout " + err), timeout);
            this.line_callback = (data) => {
                if (test(data))
                {
                    clearTimeout(expire);
                    resolve();
                }
            };
        });
    }

    getMessage(msg)
    {
        return this.waitForInput((data) => data == msg, msg);
    }

    getRegex(test)
    {
        return this.waitForInput((data) => {
            let match = test.exec(msg);
            return (match != null);
        }, "regex: " + test);
    }

    getState(expected_state)
    {
        this.waitForInput((data) => {
            let device_state = this.parseDeviceState(msg);
            for(let key in expected_state)
            {
                if (expected_state[key] != device_state[key])
                {
                    return false;
                }    
            }
            return true;
        }, "get state: " + JSON.stringify(expected_state));
    }

    parseDeviceState(message)
    {
        return { propertyname: 0 };
    }

    finish()
    {
        this.pass();
    }
};

const defaultTest = new TestScenario();
// Build promise chain
defaultTest.first().then(() =>
defaultTest.setPower(true)).then(() =>
defaultTest.getMessage("Test Starting")).then(() =>
defaultTest.getState({ propertyname: 0})).then(() =>
defaultTest.pass());

exports.default = defaultTest;
