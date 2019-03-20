import { Adapter } from "core/adapter";
import { MessageTransport } from "common/messagetransport";
import { TestCaseResults } from "common/result";
import { get } from 'config';
import { Partitions, SystemChannels, JobChannels } from "common/protocol";
import { getJunitXml } from 'junit-xml';
import AdmZip from 'adm-zip';
import request from 'request';
import { writeFileSync, readFileSync } from 'fs';
import { Readable } from 'stream';

export class AppveyorAdapter extends Adapter
{
    protected account_name:string;
    protected project_slug:string;
    protected build:string;
    protected job_storage:Map<string, string>;
    protected token:string;
    protected poll_interval:number;
    protected poll_timer:number;
    protected buildinfo:any;

    constructor(
        transport:MessageTransport)
    {
        super(transport, "Appveyor");
        this.build = null;
        this.account_name = get('Appveyor.Account');
        this.project_slug = get ('Appveyor.Project');
        this.token = get('Appveyor.Token');
        this.poll_interval = parseInt(get('Appveyor.PollIntervalSec')) * 1000;
        this.poll_timer = 0;
        this.job_storage = new Map<string, string>();
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
            time: (task.timestamp - new Date().getTime()) / 1000,
            suites: []
        };

        for(let result of results)
        {
            let suite = {
                name: task.platform + "-" + task.pool_id,
                timestamp: new Date(),
                hostname: result.worker_id,
                time: (result.task.started - result.timestamp) / 1000,
                testCases: []
            };
            let last = result.timestamp;
            for(let test of result.passing)
            {
                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: (test.finished - last) / 1000
                });
                last = test.finished;
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
        const junitXml = new Readable();
        let xmlstring = getJunitXml(test_report);
        junitXml.push(xmlstring);
        junitXml.push(null);
        console.log(xmlstring);
        this.appveyorPost("api/testresults/junit/" + results[0].task.build, {
            formData: {
                file: {
                    value: junitXml,
                    options: {
                        filetype: 'xml',
                        filename: [
                            task.build,
                            task.test.scenario,
                            task.test.name
                        ].join("_") + ".xml",
                        knownLength: junitXml
                    }
                }
            }
        })
        .then((res) => console.log(res))
        .catch((err) => console.log(err));
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
                if (err == null &&
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

    public appveyorPost(path:string, options:any): Promise<any>
    {
        return new Promise((resolve, reject) => {
            Object.assign(options, this.appveyorOptions(path));
            request.post(options, (err, res, body) => {
                if (err != null)
                {
                    reject(err);
                    return;
                }
                if(res.statusCode >= 200 &&
                   res.statusCode < 300)
                {
                    resolve(JSON.parse(body));
                } else {
                    reject(JSON.parse(body));
                }
            });
        });
    };

    public loadJob(storage_path:string, storage_id:string)
    {
        let target_job = null;
        // Find first job that needs storage
        for(let job of this.job_storage.keys())
        {
            if (this.job_storage.get(job) == null)
            {
                this.job_storage.set(job, storage_id);
                target_job = job;
                break;
            }
        }

        if (target_job == null)
        {
            throw "No jobs need storage!";
        }

        this.appveyorGet("api/buildjobs/" + target_job + "/artifacts").then((buffer) =>
        {
            let artifacts = JSON.parse(buffer);
            this.appveyorGet("api/buildjobs/" + target_job + "/artifacts/" + artifacts[0]["fileName"]).then((body) =>
            {
                let targetFile = "/tmp/" + target_job + ".zip";
                writeFileSync(targetFile, body);
                let zip = new AdmZip(targetFile);
                zip.extractAllTo(storage_path, true);
                let config = JSON.parse(readFileSync(storage_path + "/test.json", 'UTF-8'));
                config["adapter_id"] = this.id;
                config["build"] = target_job;
                config["store_id"] = storage_id;
                this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.INFO, null, {new_build: config["build"]});
                this.transport.sendMessage(Partitions.JOBS, JobChannels.NEW, this.id, config);
                console.log("Starting Appveyor job " + target_job);
            }).catch((e) => {throw e;});
        }).catch((e) => { throw e;});
    };

    public parseBuild(buffer:any)
    {
        this.buildinfo = JSON.parse(buffer);
        if (this.build != this.buildinfo["build"]["version"])
        {
            // Ensure all jobs are finished
            this.job_storage.forEach((storage:string, jobId:string) => {
                this.transport.sendMessage(
                    Partitions.JOBS,
                    JobChannels.ABORT,
                    null,
                    { build: jobId });
            });
            this.job_storage.clear();
            this.build = this.buildinfo["build"]["version"];
        }
        if (this.build != null)
        {
            for(let job of this.buildinfo["build"]["jobs"])
            {
                if (job["artifactsCount"] != 0 &&
                    !this.job_storage.has(job["jobId"]))
                {
                    this.job_storage.set(job["jobId"], null);
                    this.transport.sendMessage(
                        Partitions.SYSTEM,
                        SystemChannels.STORAGE,
                        this.id,
                        null);
                    console.log("Appveyor artifacts " + job["jobId"]);
                }
            }
        }
    };

    public process()
    {
        let timeSinceLastPoll = (new Date().getTime() - this.poll_timer);
        if (timeSinceLastPoll > this.poll_interval)
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
