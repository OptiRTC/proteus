import { Partitions, AdapterChannels, JobChannels, SystemChannels } from "protocol";
import { UniqueID } from "uniqueid";
import { readFileSync } from "fs";
export class Adapter extends UniqueID {
    constructor(transport, name) {
        super();
        this.transport = transport;
        this.name = name;
        this.transport.subscribe(this, Partitions.ADAPTER, null, this.id);
    }
    ;
    getBuild() {
        return "unknown-" + (new Date().getTime());
    }
    ;
    startJob() {
        // First request storage, do any extraction
        this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.STORAGE, this.id, null);
    }
    ;
    loadJob(store) {
        // We expect when loadJob is called tests.json
        // and all binaries are extracted into
        // the temporary storage and made
        // available to worker-clients
        // Find tests.json
        // Crack into TestComponents
        // Send job message
        let config = JSON.parse(readFileSync(store.path + "/tests.json", 'UTF-8'));
        config["adapter_id"] = this.id;
        config["build"] = this.getBuild();
        //config defines the tests
        this.transport.sendMessage(Partitions.JOBS, JobChannels.NEW, this.id, config);
    }
    ;
    onMessage(message) {
        switch (message.channel) {
            case AdapterChannels.STORAGEREADY:
                this.loadJob(message.content);
                break;
            case AdapterChannels.RESULT:
                this.handleResults(message.content);
                this.cleanupStorage(message.content[0].task.storage_id);
                break;
            case AdapterChannels.QUERY:
                this.transport.sendMessage(Partitions.ADAPTER, AdapterChannels.STATUS, this.name, { "status": "active" });
                break;
            default:
                break;
        }
    }
    ;
    cleanupStorage(storage_id) {
        this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.RELEASESTORAGE, storage_id, null);
    }
    ;
    handleResults(results) {
        console.log(JSON.stringify(results));
    }
    ;
    process() {
        // Check CI, Filesystem, etc
        // Noop here
    }
    ;
}
//# sourceMappingURL=adapter.js.map