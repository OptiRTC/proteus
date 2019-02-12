import { Adapter } from "core/adapter";
import { readFileSync, writeFileSync } from 'fs';
import { MessageTransport } from "common/messagetransport";
import { TestCaseResults } from "common/result";
import { ncp } from 'ncp';
import { Partitions, SystemChannels } from "common/protocol";
import { watch, FSWatcher } from 'chokidar';

export class FileChangeAdapter extends Adapter
{
    /* tslint:disable:no-unused-variable */
    protected debounce:NodeJS.Timeout;
    protected watcher:FSWatcher;

    constructor(
        transport:MessageTransport,
        public buildpath:string,
        public resultspath:string)
    {
        super(transport, "Watch:" + buildpath);
        this.debounce = null;
        this.watcher = watch(this.buildpath, {
            ignoreInitial: true
        });
        this.watcher
            .on('add', (e, p) => this.onChange())
            .on('change', (e, p) => this.onChange());

        this.watcher.on('error', e => {
            console.log(e);
        });
    };

    public getBuild():string
    {
        // Look for metadata.json
        let config = JSON.parse(readFileSync(this.buildpath + "/test.json").toString());
        return config["build"];
    };

    public onChange()
    {
        if (!this.debounce)
        {
            this.debounce = setTimeout(() => {
                this.transport.sendMessage(
                    Partitions.SYSTEM,
                    SystemChannels.STORAGE,
                    this.id,
                    null);
                this.debounce = null;
            }, 10000);
        }
    };

    public handleResults(results:TestCaseResults[])
    {
        // Upload Test to URL
        let name = "tests-" + results[0].task.build + "-" + (new Date().getTime());
        writeFileSync(this.resultspath + "/" + name, JSON.stringify(results));
    };

    public loadJob(storage_path:string, storage_id:string)
    {
        new Promise<void>((resolve, reject) => {
            ncp(this.buildpath, storage_path, { clobber: true }, (err) => {
                if (!err)
                {
                    resolve();
                } else {
                    reject(err);
                }
            });
        }).then(() => super.loadJob(storage_path, storage_id));

    }
};
