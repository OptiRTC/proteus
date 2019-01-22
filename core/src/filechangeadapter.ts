import { Adapter } from "adapter";
import { watch, FSWatcher, readFileSync, writeFileSync } from 'fs';
import { MessageTransport, Message } from "messagetransport";
import { TestCases } from "result";
import { TmpStorage } from "storage";
import { ncp } from 'ncp';
import { Partitions, SystemChannels } from "protocol";

export class FileChangeAdapter extends Adapter
{
    private watcher:FSWatcher;

    constructor(
        transport:MessageTransport, 
        public buildpath:string,
        public resultspath:string)
    {
        super("Watch:" + buildpath, transport);
        this.watcher = watch(buildpath, this.onChange);
    };

    public getBuild():string
    {
        // Look for metadata.json
        let config = JSON.parse(readFileSync(this.buildpath + "/metadata.json", 'UFT-8'));
        return config["build"];
    };

    public onChange(event:string, filename:string)
    {
        this.transport.sendMessage(new Message(
            Partitions.SYSTEM,
            SystemChannels.STORAGE,
            this.id,
            null));
    };

    public handleResults(results:TestCases[])
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
