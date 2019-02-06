const BaseScenario = require('./base-scenario')
const child_process = require('child_process');
const fs = require('fs');
const config = require('config');

class ParticleScenario extends BaseScenario
{
    constructor()
    {
        this.POWER_PIN = Gpio(config.get('GPIO.RST'), 'out');
        this.port = null;
    }

    openSerial()
    {
        return new Promise((resolve, reject) =>{
            // Check for DFU port
            let n = 0;
            let check = () => {
                fs.exists(config.get('Serial.port'), (e) => {
                    if (e)
                    {
                        this.port = new SerialPort(config.get('Worker.port'),(e) => (this.onPortError(e)));
                        this.port.open();
                        const readline = new SerialPort.parsers.Readline({ delimiter: '\r\n' });
                        readline.on('data', (data) => { if (this.line_callback != null) this.line_callback(data); });
                        this.port.pipe(readline);
                        resolve();
                    } else {
                        if (n < 5)
                        {
                            setTimeout(check, 4000);
                        } else {
                            reject();
                        }
                    }
                });
            };
            check();
        });
       
    }

    onPortError(e)
    {
        this.port.open();
    }

    flashCmd(binary)
    {
        this.binary = binary;
        return new Promise((resolve, reject) => {
            let child = child_process.exec("particle flash --usb " + this.binary, (err, stdout, stderr) => {
                if (err.code != 0)
                {
                    reject();
                } else {
                    resolve();
                }
            });
            child.on('exit', (code) => {
                if (code == 0)
                {
                    resolve();
                } else {
                    reject();
                }
            });     
        });
    }

    dfuMode()
    {
        return new Promise((resolve, reject) =>{
            // Check for DFU port
            let dfuport;
            let n = 0;
            let check = () => {
                fs.exists(config.get('Serial.dfuPort'), (e) => {
                    if (e)
                    {
                        resolve();
                    } else {
                        if (n < 5)
                        {
                            dfuport = new SerialPort(
                                get('Serial.port'),
                                { 
                                    baudRate: 14400 // Particle magic baud
                                });
                            dfuport.open();
                            setTimeout(check, 2000);
                        } else {
                            reject();
                        }
                    }
                });
            };
            check();
        });
    }

    waitForLine(test, err = "waitForInput", timeout = this.DEFAULT_TIMEOUT)
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
        return this.waitForLine((data) => data == msg, msg);
    }

    getRegex(test)
    {
        return this.waitForLine((data) => {
            let match = test.exec(msg);
            return (match != null);
        }, "regex: " + test);
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
};

exports.default = ParticleScenario;
