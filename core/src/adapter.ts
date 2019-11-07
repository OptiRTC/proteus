import { UniqueID } from "common/uniqueid";
import { ArrayFromJSON } from "common/messagetransport";
import { readFileSync } from "fs";
import { TestCaseResults } from "common/result";
import { TestComponent } from "common/testcomponents";
import { Job } from "core/job";
import { ProteusCore } from "core/proteuscore";
import { ProteusStorage } from "common/storage";

export class Adapter extends UniqueID
{
    constructor(
        public name:string,
        public parent:ProteusCore)
    {
        super();
    };

    public getBuild():string
    {
        return "unknown-" + (new Date().getTime());
    };

    public async startJob(storage:ProteusStorage)
    {
        let config = JSON.parse(readFileSync(storage.path + "/test.json", 'UTF-8'));
        config["adapter_id"] = this.id;
        config["build"] = this.getBuild();
        config["store_id"] = storage.id;
        
        console.log("Starting Appveyor job " + this.getBuild());
        for(let platform of config["platforms"])
        {
            this.parent.registerJob(new Job(
                config["build"],
                this.id,
                platform,
                config["pool"],
                storage,
                ArrayFromJSON(TestComponent, config["tests"])
                ));
            }
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
