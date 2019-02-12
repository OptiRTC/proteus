import { MessageTransport, TransportClient, Message } from "common/messagetransport";
import { Partitions, AdapterChannels, JobChannels, SystemChannels } from "common/protocol";
import { UniqueID } from "common/uniqueid";
import {readFileSync} from "fs";
import { TestCaseResults } from "common/result";

export class Adapter extends UniqueID implements TransportClient
{
    constructor(
        public transport:MessageTransport,
        public name:string)
    {
        super();
        this.transport.subscribe(
            this,
            Partitions.ADAPTER,
            null,
            this.id);
    };

    public getBuild():string
    {
        return "unknown-" + (new Date().getTime());
    };

    public startJob()
    {
        // First request storage, do any extraction
        this.transport.sendMessage(
            Partitions.SYSTEM,
            SystemChannels.STORAGE,
            this.id,
            null);
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
        this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.INFO, null, {new_build: config["build"]});
        //config defines the tests
        this.transport.sendMessage(Partitions.JOBS, JobChannels.NEW, this.id, config);
    };

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case AdapterChannels.STORAGEREADY:
                this.loadJob(message.content["storage_path"], message.content["storage_id"]);
                break;

            case AdapterChannels.RESULT:
                this.handleResults(message.content);
                this.cleanupStorage(message.content[0].task.storage_id);
                break;

            case AdapterChannels.QUERY:
                this.transport.sendMessage(
                    Partitions.ADAPTER,
                    AdapterChannels.STATUS,
                    this.name,
                    { "status": "active" });
                break;

            default:
                break;
        }
    };

    public cleanupStorage(storage_id:string)
    {
        this.transport.sendMessage(
            Partitions.SYSTEM,
            SystemChannels.RELEASESTORAGE,
            storage_id,
            null);
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
