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
        this.messageWaits = [];
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
            
            this.port = new SerialPort(config.get('Worker.port'),(e) => (this.onPortError(e)));
            this.port.open();
            const readline = new SerialPort.parsers.Readline({ delimiter: '\r\n' });
            readline.on('data', (data) => {
                if (this.messageWaits.length > 0)
                {
                    let remove = this.messageWaits[0](data);
                    if (remove)
                    {
                        this.messageWaits.shift();
                    }
                }
            });
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

    getMessage(msg)
    {
        return new Promise((resolve, reject) =>
        {
           this.messageWaits.push((input) => {
                if (input == msg)
                {
                    resolve();
                    return true;
                }
                return false;
           });
        });
    }

    getRegex(test)
    {
        return new Promise((resolve, reject) =>
        {
            this.messageWaits.push((msg) => {
                let match = test.exec(msg);
                if (match != null)
                {
                    resolve(match);
                    return true;
                }
                return false;
            });
        });
    }

    getState(expected_state)
    {
        return new Promise((resolve, reject) =>
        {
            this.messageWaits.push((msg) => {
                let device_state = this.parseDeviceState(msg);
                for(let key in expected_state)
                {
                    if (expected_state[key] != device_state[key])
                    {
                        return false;
                    }    
                }
                resolve(device_state);
                return true;
            });
        });
    }

    waitFor(func)
    {
        return new Promise((resolve, reject) =>
        {
            this.messageWaits.push((msg) => {
                var res = func(msg);
                if (res)
                {
                    resolve(res);
                    return true;
                } else {
                    return false;
                }
            });
        });
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
defaultTest.first().then(
    defaultTest.setPower(true).then(() =>
    defaultTest.getMessage("Test Starting").then(() =>
    defaultTest.getState({ propertyname: 0}).then(() =>
    defaultTest.pass()))));

exports.default = defaultTest;
