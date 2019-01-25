import { Adapter } from "adapter";
import { watch, FSWatcher, readFileSync, writeFileSync } from 'fs';
import { MessageTransport } from "messagetransport";
import { TestCaseResults } from "result";
import { TmpStorage } from "storage";
import { ncp } from 'ncp';
import { Partitions, SystemChannels } from "protocol";

export class FileChangeAdapter extends Adapter
{
    /* tslint:disable:no-unused-variable */
    protected watcher:FSWatcher;

    constructor(
        transport:MessageTransport,
        public buildpath:string,
        public resultspath:string)
    {
        super(transport, "Watch:" + buildpath);
        this.watcher = watch(this.buildpath, (e, f) => this.onChange());
    };

    public getBuild():string
    {
        // Look for metadata.json
        let config = JSON.parse(readFileSync(this.buildpath + "/tests.json", 'UFT-8').toString());
        return config["build"];
    };

    public onChange()
    {
        this.transport.sendMessage(
            Partitions.SYSTEM,
            SystemChannels.STORAGE,
            this.id,
            null);
    };

    public handleResults(results:TestCaseResults[])
    {
        // Upload Test to URL
        let name = "tests-" + results[0].task.build + "-" + (new Date().getTime());
        writeFileSync(this.resultspath + "/" + name, JSON.stringify(results));
    };

    public loadJob(store:TmpStorage)
    {
        ncp(this.buildpath, store.path, () => {
            super.loadJob(store);
        });
    };
};
