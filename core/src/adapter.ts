import { MessageTransport, TransportClient, Message } from "common/messagetransport";
import { Partitions, AdapterChannels, JobChannels, SystemChannels } from "common/protocol";
import { UniqueID } from "common/uniqueid";
import {readFileSync} from "fs";
import { TestCaseResults } from "common/result";
import { Job } from "job";
import { ProteusCore } from "proteuscore";

export class Adapter extends UniqueID
{

    public jobs:Job[];

    constructor(
        public name:string,
        public parent:ProteusCore)
    {
        super();
        this.jobs = [];
    };

    public getBuild():string
    {
        return "unknown-" + (new Date().getTime());
    };

    public async startJob()
    {
        // Resolves with a list of jobs initialized with storage
    };

    public loadJob(storage_path:string, storage_id:string)
    {
        // We expect when loadJob is called tests.json
        // and all binaries are extracted into
        // the temporary storage and made
        // available to worker-clients

        // Find tests.json
        // Crack into TestComponents
        // Send job message
        let config = JSON.parse(readFileSync(storage_path + "/test.json", 'UTF-8'));
        config["adapter_id"] = this.id;
        config["build"] = this.getBuild();
        config["store_id"] = storage_id;
    };

    public cleanupStorage(storage_id:string)
    {
       
    };

    public handleResults(results:TestCaseResults[])
    {
        console.log(JSON.stringify(results));
    };

    public process()
    {
        // Check CI, Filesystem, etc
        // Noop here
    };
}
