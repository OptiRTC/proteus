import { Adapter } from "adapter";
import { get } from 'config';
import { request } from "http";
import { Partitions, SystemChannels } from "protocol";
import { Extract } from "unzip";
import { getJunitXml } from 'junit-xml';
import { Readable } from "stream";
export class AppveyorAdapter extends Adapter {
    constructor(transport) {
        super(transport, "Appveyor");
        this.build = "0.0.0-0";
        this.account_name = get('Appveyor.Account');
        this.project_slug = get('Appveyor.Project');
        this.token = get('Appveyor.Token');
        this.poll_interval = get('Appveyor.PollInterval');
        this.poll_timer = new Date().getTime();
        this.urlmap = new Map();
    }
    ;
    getBuild() {
        return this.build;
    }
    ;
    handleResults(results) {
        // Upload Test to URL
        let task = results[0].task;
        let test_report = {
            name: task.build,
            time: task.timestamp - new Date().getTime(),
            suites: []
        };
        for (let result of results) {
            let suite = {
                name: task.platform + "-" + task.pool_id,
                timestamp: new Date().getTime(),
                hostname: result.worker_id,
                time: result.task.started - result.timestamp,
                testCases: []
            };
            for (let test of result.passing) {
                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: 0
                });
            }
            for (let test of result.skipped) {
                suite.testCases.push({
                    name: test.name,
                    assertions: test.assertions,
                    classname: test.classname,
                    time: 0,
                    skipped: true,
                });
            }
            for (let test of result.failed) {
                let failures = test.messages.map((v) => {
                    return { message: v };
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
        }
        ;
        const junitXml = getJunitXml(test_report);
        const stream = new Readable();
        stream._read = () => { };
        stream.push(junitXml);
        let options = this.appveyorOptions(this.urlmap[results[0].task.build]);
        options['method'] = "POST";
        options['formData'] = {
            file: stream
        };
        request(options, (res) => {
            if (res.statusCode >= 200 &&
                res.statusCode < 300) {
                console.log("Upload Error");
            }
        });
    }
    ;
    appveyorOptions(path) {
        return {
            hostname: "ci.appveyor.com",
            port: 443,
            path: path,
            headers: {
                Authorization: 'Bearer ' + this.token
            }
        };
    }
    ;
    appveyorGet(path, callback) {
        request(this.appveyorOptions(path), (res) => {
            let buffer = "";
            res.on('data', (chunk) => {
                buffer += chunk;
            });
            res.on('end', () => {
                callback(buffer);
            });
        });
    }
    ;
    loadJob(store) {
        this.appveyorGet("api/buildjobs/" + this.buildinfo["build"]["jobs"][0]["jobId"] + "/artifacts", (buffer) => {
            let artifacts = JSON.parse(buffer);
            let options = {
                hostname: "ci.appveyor.com",
                port: 443,
                path: "api/buildjobs/" + this.buildinfo["build"]["jobs"][0]["jobId"] + "/artifacts/" + artifacts[0]["fileName"],
                headers: {
                    Authorization: 'Bearer ' + this.token
                }
            };
            this.urlmap[this.build] = "api/testresults/junit/" + this.buildinfo["build"]["jobs"][0]["jobId"];
            request(options).pipe(Extract({ path: store.path }));
            super.loadJob(store);
        });
    }
    ;
    parseBuild(buffer) {
        this.buildinfo = JSON.parse(buffer);
        if (this.build != this.buildinfo["build"]["version"] &&
            this.build["jobs"][0]["artifactsCount"] > 0) {
            this.build = this.buildinfo["build"]["version"];
            this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.STORAGE, this.id, null);
        }
    }
    ;
    process() {
        if ((new Date().getTime() - this.poll_timer) > this.poll_interval) {
            this.appveyorGet("api/projects/" + this.account_name + "/" + this.project_slug, (buf) => this.parseBuild(buf));
        }
    }
    ;
}
;
//# sourceMappingURL=appveyoradapter.js.map