import { Adapter } from "core/adapter";
import { MessageTransport } from "common/messagetransport";
import { TestCaseResults } from "common/result";
import { get } from 'config';
import { Partitions, SystemChannels, JobChannels } from "common/protocol";
import AdmZip from 'adm-zip';
import request from 'request';
import { writeFileSync, readFileSync, createReadStream } from 'fs';
import * as xmlbuilder from 'xmlbuilder';
import { ProteusCore } from "proteuscore";

// https://raw.githubusercontent.com/junit-team/junit5/master/platform-tests/src/test/resources/jenkins-junit.xsd
class junit
{
    protected xml:string;

    constructor(results:TestCaseResults[])
    {
        let task = results[0].task;

        let total_tests = 0;
        let total_failures = 0;
        let total_time = 0;
        results.reduce((acc, res:TestCaseResults) => acc + res.failed.length, 0);
        results.forEach((res:TestCaseResults) => {
            total_tests += res.passing.length;
            total_tests += res.skipped.length;
            total_failures += res.failed.length;
            total_time += res.timestamp - res.task.started;
        })
        total_tests += total_failures;

        let root = xmlbuilder.create('testsuites')
            .att('name', task.platform + "-" + task.pool_id)
            .att('tests', total_tests)
            .att('failures', total_failures)
            .att('time', total_time);

        for(let result of results)
        {
            let testclass_name = result.task.test.name;
            let suite = root.ele(
                'testsuite',
                {
                    name: result.task.test.scenario,
                    tests: result.passing.length + result.failed.length + result.skipped.length,
                    failures: result.failed.length,
                    time: result.timestamp - result.task.started,
                    skipped: result.skipped.length,
                    timestamp: result.timestamp,
                    hostname: result.worker_id
                });

            let last = result.task.started;
            for(let test of result.passing)
            {
                suite.ele(
                    'testcase',
                    {
                        name: test.name,
                        assertions: test.assertions || 0,
                        time: (test.finished - last),
                        classname: testclass_name,
                        status: test.status
                    });
                last = test.finished;
            }

            for(let test of result.skipped)
            {
                suite.ele(
                    'testcase',
                    {
                        name: test.name,
                        assertions: test.assertions || 0,
                        time: (test.finished - last),
                        classname: testclass_name,
                        status: test.status
                    }).ele('skipped');
                last = test.finished;
            }

            for(let test of result.failed)
            {
                let failures = test.messages.map((v) => {
                    return { message: v};
                });
                suite.ele(
                    'testcase',
                    {
                        name: test.name,
                        assertions: test.assertions || 0,
                        time: (test.finished - last),
                        classname: testclass_name,
                        status: test.status
                    }).ele('failure', JSON.stringify(failures));
                last = test.finished;
            }
        };
        this.xml = root.end({pretty: true});
    }

    public writeFile(path:string)
    {
        writeFileSync(path, this.xml);
    };

    public xmlString():string
    {
        return this.xml;
    };
};

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
        parent:ProteusCore)
    {
        super("Appveyor", parent);
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
        let junitxml = new junit(results);
        let file = "/tmp/results_" + results[0].task.build + ".xml";
        console.log(junitxml.xmlString());
        junitxml.writeFile(file);
        this.appveyorUpload("api/testresults/junit/" + results[0].task.build, file)
        .then((res) => {
            try {
                console.log(JSON.parse(res));
            } catch(e) {
                // NOOP
            }
        })
        .catch((err) => {
            try {
                console.log(JSON.parse(err));
            } catch(e) {
                // NOOP
            }
            
        });
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

    public appveyorUpload(path:string, file:string): Promise<any>
    {
        return new Promise((resolve, reject) => {
            let req = request.post(this.appveyorOptions(path), (err, res, body) => {
                if (err != null)
                {
                    reject(err);
                    return;
                }
                if (res.statusCode >= 200 &&
                    res.statusCode < 300)
                {
                    resolve(body);
                } else {
                    reject(body);
                }
            });
            req.form().append('file', createReadStream(file));
        });
    }

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
        console.log("Fetching Artifact Metadata for " + target_job);
        let fetch_timeout = null;
        let fetch = () => {
            this.appveyorGet("api/buildjobs/" + target_job + "/artifacts").then((buffer) =>
            {
                let artifacts = JSON.parse(buffer);
                console.log("Fetching Artifact ZIP for " + target_job);
                this.appveyorGet("api/buildjobs/" + target_job + "/artifacts/" + artifacts[0]["fileName"]).then((body) =>
                {
                    console.log("Extracting ZIP for " + target_job);
                    let targetFile = "/tmp/" + target_job + ".zip";
                    writeFileSync(targetFile, body);
                    let zip = new AdmZip(targetFile);
                    zip.extractAllTo(storage_path, true);
                    let config = JSON.parse(readFileSync(storage_path + "/test.json", 'UTF-8'));
                    config["adapter_id"] = this.id;
                    config["build"] = target_job;
                    config["store_id"] = storage_id;
                    if (fetch_timeout != null)
                    {
                        clearTimeout(fetch_timeout);
                    }
                    console.log("Starting Appveyor job " + target_job);
                }).catch((e) => console.log(e));
            }).catch((e) => console.log(e));
        };
        let refetch = () => {
            fetch();
            fetch_timeout = setTimeout(refetch, 60000);
        };
        refetch();
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
