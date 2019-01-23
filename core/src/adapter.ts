import { MessageTransport, TransportClient, Message } from "messagetransport";
import { Partitions, AdapterChannels, JobChannels, SystemChannels } from "protocol";
import { UniqueID } from "uniqueid";
import {readFileSync} from "fs";
import { TmpStorage } from "storage";
import { TestCases } from "result";

export class Adapter extends UniqueID implements TransportClient
{
    constructor(
        public transport:MessageTransport,
        public name:string
        )
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
        this.transport.sendMessage(new Message(
            Partitions.SYSTEM,
            SystemChannels.STORAGE,
            this.id,
            null));
    };

    public loadJob(store:TmpStorage)
    {
        // We expect when loadJob is called tests.json
        // and all binaries are extracted into
        // the temporary storage and made
        // available to worker-clients

        // Find tests.json
        // Crack into TestComponents
        // Send job message
        let config = JSON.parse(readFileSync(store.path + "/tests.json", 'UFT-8'));
        config["adapter_id"] = this.id;
        config["build"] = this.getBuild();
        //config defines the tests
        this.transport.sendMessage(new Message(Partitions.JOBS, JobChannels.NEW, this.id, config));
    };

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case AdapterChannels.STORAGEREADY:
                this.loadJob(message.content);
                break;

            case AdapterChannels.RESULT:
                this.handleResults(message.content);
                break;

            case AdapterChannels.QUERY:
                this.transport.sendMessage(new Message(
                    Partitions.ADAPTER,
                    AdapterChannels.STATUS,
                    this.name,
                    { "status": "active" }));
                break;

            default:
                break;
        }
    };

    public handleResults(results:TestCases[])
    {
        console.log(JSON.stringify(results));
    };

    public process()
    {
        // Check CI, Filesystem, etc
        // Noop here
    };
}
