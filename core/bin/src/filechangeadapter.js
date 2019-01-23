import { Adapter } from "adapter";
import { watch, readFileSync, writeFileSync } from 'fs';
import { Message } from "messagetransport";
import { ncp } from 'ncp';
import { Partitions, SystemChannels } from "protocol";
export class FileChangeAdapter extends Adapter {
    constructor(transport, buildpath, resultspath) {
        super(transport, "Watch:" + buildpath);
        this.buildpath = buildpath;
        this.resultspath = resultspath;
        this.watcher = watch(buildpath, this.onChange);
    }
    ;
    getBuild() {
        // Look for metadata.json
        let config = JSON.parse(readFileSync(this.buildpath + "/tests.json", 'UFT-8'));
        return config["build"];
    }
    ;
    onChange(event, filename) {
        this.transport.sendMessage(new Message(Partitions.SYSTEM, SystemChannels.STORAGE, this.id, null));
    }
    ;
    handleResults(results) {
        // Upload Test to URL
        let name = "tests-" + results[0].task.build + "-" + (new Date().getTime());
        writeFileSync(this.resultspath + "/" + name, JSON.stringify(results));
    }
    ;
    loadJob(store) {
        ncp(this.buildpath, store.path, () => {
            super.loadJob(store);
        });
    }
    ;
}
;
//# sourceMappingURL=filechangeadapter.js.map