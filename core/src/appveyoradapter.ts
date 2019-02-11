import { Adapter } from "core/adapter";
import {MessageTransport} from "common/messagetransport";
import { TestCaseResults } from "common/result";
import { get } from 'config';
import { TmpStorage } from "common/storage";
import { Partitions, SystemChannels } from "common/protocol";
import { getJunitXml } from 'junit-xml';
import { Readable } from "stream";
import AdmZip from 'adm-zip';
import request from 'request';
import { writeFileSync } from 'fs';

export class AppveyorAdapter extends Adapter
{
    protected account_name:string;
    protected project_slug:string;
    protected build:string;
    protected token:string;
    protected poll_interval:number;
    protected poll_timer:number;
    protected buildinfo:any;
    protected urlmap:Map<string,string>;

    constructor(
        transport:MessageTransport)
    {
        super(transport, "Appveyor");
        this.build = "0.0.0-0";
        this.account_name = get('Appveyor.Account');
        this.project_slug = get ('Appveyor.Project');
        this.token = get('Appveyor.Token');
        this.poll_interval = parseInt(get('Appveyor.PollIntervalSec')) * 1000;
        this.poll_timer = 0;
        this.urlmap = new Map<string,string>();
    };

    public getBuild():string
    {   
        return this.build;
    };

    public handleResults(results:TestCaseResults[])
    {
        // Upload Test to URL
        let task = results[0].task;
        let test_report = {
            name: task.build,
            time: task.timestamp - new Date().getTime(),
            suites: []
        };

        for(let result of results)
        {
            let suite = {
                name: task.platform + "-" + task.pool_id,
                timestamp: new Date().getTime(),
                hostname: result.worker_id,
                time: result.task.started - result.timestamp,
                testCases: []
            };

            for(let test of result.passing)
            {
                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: 0
                });
            }

            for(let test of result.skipped)
            {
                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: 0,
                    skipped: true,
                });
            }

            for(let test of result.failed)
            {
                let failures = test.messages.map((v) => {
                    return { message: v};
                });

                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: 0,
                    failures: failures
                });
            }

            test_report.suites.push(suite);
        };
        const junitXml = getJunitXml(test_report);
        const stream = new Readable();
        stream._read = () => {};
        stream.push(junitXml);
        let options = this.appveyorOptions(this.urlmap[results[0].task.build]);
        
        options['formData'] = {
            file: stream
        };

        request.post(options);
    };

    public appveyorOptions(path:string)
    {
        return {
            url: "https://ci.appveyor.com/" + path,
            headers: {
                'Authorization': 'Bearer ' + this.token
            },
            encoding: null
        };
    };

    public appveyorGet(path:string): Promise<any>
    {
        return new Promise((resolve, reject) => {
            request(this.appveyorOptions(path), (err, res, body) => {
                if (!err &&
                    res.statusCode >= 200 &&
                    res.statusCode < 300)
                {
                    resolve(body);
                } else {
                    reject(err);
                }
            });
        });
    };

    public loadJob(store:TmpStorage)
    {
        this.appveyorGet("api/buildjobs/" + this.buildinfo["build"]["jobs"][0]["jobId"] + "/artifacts").then((buffer) =>
        {
            let artifacts = JSON.parse(buffer);
            this.urlmap[this.build] = "api/testresults/junit/" + this.buildinfo["build"]["jobs"][0]["jobId"];
            this.appveyorGet("api/buildjobs/" + this.buildinfo["build"]["jobs"][0]["jobId"] + "/artifacts/" + artifacts[0]["fileName"]).then((body) => 
            {
                let targetFile = "/tmp/" + this.buildinfo["build"]["jobs"][0]["jobId"] + ".zip";
                writeFileSync(targetFile, body);
                let zip = new AdmZip(targetFile);
                zip.extractAllTo(store.path, true);
                super.loadJob(store);
            }).catch((e) => {
                console.log(e);
            });
        }).catch((e) => {
            console.log(e);
        });
    };

    public parseBuild(buffer:any)
    {
        this.buildinfo = JSON.parse(buffer);
        if (this.build != this.buildinfo["build"]["version"] &&
            this.buildinfo["build"]["jobs"][0]["artifactsCount"] > 0)
        {
            this.build = this.buildinfo["build"]["version"];
            this.transport.sendMessage(
                Partitions.SYSTEM,
                SystemChannels.STORAGE,
                this.id,
                null);
        }
    };

    public process()
    {
        if ((new Date().getTime() - this.poll_timer) > this.poll_interval)
        {
            this.poll_timer = new Date().getTime();
            this.appveyorGet("api/projects/" + this.account_name + "/" + this.project_slug)
            .then((buf) => {
                this.parseBuild(buf);
            }).catch((e) => {
                console.log(e);
            });
        }
    };
};
