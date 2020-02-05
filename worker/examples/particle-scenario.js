const BaseScenario = require('./base-scenario').BaseScenario;
const SerialPort = require('serialport');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const SER_PORT = process.env.PORT || '/dev/ttyACM0';
const RST_PIN  = process.env.RST_PIN || "none";
const PLATFORM = process.env.PLATFORM || 'test';

class ParticleScenario extends BaseScenario
{
    constructor()
    {
        super();
        this.name = "Particle Scenario";
        this.line_callback = null;
        this.port = null;
        console.log("Using reset pin " + RST_PIN);
        if (RST_PIN != "none")
        {
            const Gpio = require('onoff').Gpio;
            this.POWER_PIN = new Gpio(parseInt(RST_PIN), 'out');
        } else {
            this.POWER_PIN = {};
            this.POWER_PIN.writeSync = (state) => console.log("writeSync: stub");
            this.POWER_PIN.unexport = () => console.log("unexport: stub");
        }

        process.on('SIGINT', () => this.POWER_PIN.unexport());
    }

    openSerial()
    {
        return new Promise((resolve, reject) =>{
            // Check for DFU port
            let n = 0;
            let timer = null;
            let check = () => {
                if (timer != null)
                { 
                    clearTimeout(timer);
                    timer = null;
                }
                n += 1;
                if (n > 5) {
                    reject("Could not open " + SER_PORT);
                }
                fs.exists(SER_PORT, (e) => {
                    if (e)
                    {
                        this.port = new SerialPort(SER_PORT, { baudRate: 115200 }, (e) => {
                            if (e) 
                            {
                                if (timer == null)
                                {
                                    timer = setTimeout(check, 6000);
                                }
                            }
                        });
                        this.port.on('open', () => {
                            if (timer != null)
                            {
                                clearTimeout(timer);
                                timer = null;
                            }
                            const readline = new SerialPort.parsers.Readline({ delimiter: '\r\n' });
                            readline.on('data', (data) => {
                                console.log("Device: " + data);
                                if (this.line_callback != null) {
                                    this.line_callback(data);
                                }
                            });
                            this.port.pipe(readline);
                            resolve();
                        });
                    } else {
                        if (timer == null)
                        {
                            timer = setTimeout(check, 6000);
                        }
                    }
                });
            };
            check();
        });
    }

    flashCmd(binary)
    {
        this.binary = binary;
        let binpath = path.resolve(__dirname, "bin/" + PLATFORM + "/" + this.binary);
        return new Promise((resolve, reject) => {
            let n = 0;
            let check = () => {
                let child = child_process.exec("particle flash --usb " + binpath, (err, stdout, stderr) => {
                    let message = "" + JSON.stringify(err) + "\n" + stdout + "\n" + stderr;
                    if (err)
                    {
                        reject(message);
                    } else {
                        if (/Flash success!/.test(stdout))
                        {
                            resolve();
                            return;
                        }
                    }
                    setTimeout(check, 6000);
                });
            }
            check();
        });
    }

    dfuMode()
    {
        return new Promise((resolve, reject) => {
            let n = 0;
            let check = () => 
            {
                n += 1;
                if (n > 3)
                {
                    reject("DFU Mode: Too many retries");
                    return;
                }
                let child = child_process.exec("dfu-util -l", (err, stdout, stderr) => {
                    if (err)
                    {
                        reject(stderr);
                    } else if (/\[2b04:d0(..)\]/.test(stdout)) {
                        resolve();
                        return;
                    } else {
                        fs.exists(SER_PORT, (e) => {
                            if (e)
                            {
                                let dfuport = new SerialPort(
                                    SER_PORT,
                                    { baudRate: 14400 },
                                    e => setTimeout(check, 4000));
                                dfuport.on('open', () => {
                                    dfuport.close();
                                });
                            } 
                            setTimeout(check, 4000);
                        });
                    }
                });
            };
            check();
        });
    }

    writeSerial(value)
    {
        return new Promise((resolve, reject) =>
        {
            this.port.write(value, (err) => {
                if (err)
                {
                    reject(err);
                } else {
                    resolve();
                }
            });
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
                    this.line_callback = null;
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

exports.ParticleScenario = ParticleScenario;
