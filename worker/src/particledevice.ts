import { Device } from "worker:device";
import { get } from "config";
import SerialPort = require('serialport');
import { exec } from 'child_process';
import { exists } from "fs";
import { TestCaseResults, Result, TestStatus } from "common:result";

export class ParticleDevice implements Device
{
    public finished:boolean;
    public testcase:TestCaseResults;
 
    protected port:SerialPort;
    protected assertions:string[];
    protected binary:string;
    protected assertion_regex:RegExp;
    protected test_regex:RegExp;
    protected summary_regex:RegExp;
    protected storage_id:string;

    protected rejectTimeout:any;
    protected result_resolve:any;

    constructor()
    {
        this.finished = false;
        this.testcase = new TestCaseResults();
        this.assertion_regex = new RegExp(/^Assertion\s(.+)\:\s(.+)/);
        this.test_regex = new RegExp(/^Test\s([a-zA-Z9-0_]+)\s([a-z]+)\./);
        this.summary_regex = new RegExp(/^Test\ssummary\:\s([0-9]+)\spassed,\s([0-9]+)\sfailed,\sand\s([0-9]+)\sskipped,\sout\sof\s([0-9]+)\stest\(s\)\./);
    };

    protected async flashCmd(binary:string): Promise<void>
    {
        this.binary = binary;
        return new Promise((resolve, reject) => {
            let child = exec("particle flash --usb " + this.binary, (err, stdout, stderr) => {
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
    };

    protected dfuMode(): Promise<void>
    {
        return new Promise((resolve, reject) =>{
            // Check for DFU port
            let dfuport:SerialPort;
            let n = 0;
            let check = () => {
                exists(get('Serial.dfuPort'), (e) => {
                    if (e)
                    {
                        dfuport.close()
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
                            setTimeout(check, 6000);
                        } else {
                            reject();
                        }
                    }
                });
            };
            check();
        });
    };

    public runTest(message:any): Promise<TestCaseResults>
    {
        this.storage_id = message.storage_id;
        let test = message.test;
        return new Promise<TestCaseResults>((resolve, reject) =>
        {
            this.result_resolve = resolve;
            this.rejectTimeout = setTimeout(() => reject(), get('Worker.timeout'));
            this.finished = false;
            this.dfuMode().then(() => 
            {
                this.flashCmd(this.storage_id + test.binary).then(() =>
                {
                    this.port = new SerialPort(
                        get('Serial.port'),
                        { 
                            baudRate: 115200
                        });
                    if (test.scenario != null)
                    {
                        // Scenarios are a promise chain
                        let scenario = require(this.storage_id + test.scenario);
                        scenario.run().then(() => {
                            this.testcase = new TestCaseResults({
                                worker_id: get('Worker.id'),
                                timestamp: new Date().getTime(),
                                passing: [new Result({
                                    name: scenario.name,
                                    classname: scenario.name,
                                    status: TestStatus.PASSING})
                                ]
                            });
                        }).catch((e) => {
                            this.testcase = new TestCaseResults({
                                worker_id: get('Worker.id'),
                                timestamp: new Date().getTime(),
                                failed: [new Result({
                                    name: scenario.name,
                                    classname: scenario.name,
                                    status: TestStatus.FAILED,
                                    messages: [e]})
                                ]
                            });
                        }).finally(() => this.finish());
                    } else {
                        const readline = new SerialPort.parsers.Readline({ delimiter: '\r\n' });
                        readline.on('data', (data) => {
                            this.handleLine(data);
                        });
                        this.port.pipe(readline);
                    }
                });
            });
        });
    };

    public abortTest()
    {
        this.finish();
    };

    protected finish()
    {
        clearTimeout(this.rejectTimeout);
        this.port.close();
        this.assertions = [];
        this.testcase.timestamp = new Date().getTime();
        this.finished = true;
        (async () => await this.dfuMode())();
        this.result_resolve(this.testcase);
    };

    public handleLine(data:any)
    {
        // Parse a test line
        let message = this.assertion_regex.exec(data);
        if (message != null)
        {
            this.assertions.push(data);
            return;
        }
        message = this.test_regex.exec(data);
        if (message != null)
        {
            let res = new Result({
                name: message[1],
                classname: this.binary,
                status: message[2] == "failed" ? TestStatus.FAILED : TestStatus.PASSING,
                assertions: 1,
                finished: new Date().getTime(),
                messages: this.assertions
            });
            if (message[2] == "failed")
            {
                this.testcase.failed.push(res);
            } else {
                this.testcase.passing.push(res);
            }
            return;
        }
        message = this.summary_regex.exec(data);
        if (message != null)
        {
            this.finish();
        }
    };
};
