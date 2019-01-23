import { Job } from "job";
import { Pool } from "pool";
import { Message } from "messagetransport";
import { Partitions, WorkerChannels, AdapterChannels, SystemChannels, JobChannels } from "protocol";
import { Platforms } from "platforms";
import { TmpStorage } from "storage";
export class ProteusCore {
    constructor(transport) {
        this.transport = transport;
        this.createPool("default");
        this.transport.subscribe(this, Partitions.JOBS, null, null);
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
        this.transport.subscribe(this, Partitions.SYSTEM, null, null);
        this.jobs = [];
        this.pools = [];
        this.default_platforms = [];
        this.default_tests = [];
        this.stores = [];
        this.adapters = [];
    }
    ;
    onMessage(message) {
        switch (message.partition) {
            case Partitions.JOBS:
                this.handleJobMessage(message);
                break;
            case Partitions.WORKERS:
                this.handleWorkerDiscovery(message);
                break;
            case Partitions.SYSTEM:
                this.handleSystemMessage(message);
                break;
            default:
                break;
        }
    }
    ;
    handleSystemMessage(message) {
        switch (message.channel) {
            case SystemChannels.STORAGE:
                let store = new TmpStorage();
                this.stores.push(store);
                this.transport.sendMessage(new Message(Partitions.ADAPTER, AdapterChannels.STORAGEREADY, message.address, store));
                break;
            default:
                break;
        }
    }
    ;
    handleWorkerDiscovery(message) {
        this.selectPool(message.content['pool']).discoverWorker(message);
    }
    ;
    handleJobMessage(message) {
        if (message.channel == JobChannels.NEW) {
            let platforms = [];
            if (message.content["platforms"] != undefined) {
                // Should be an array of strings
                for (let platform of message.content["platforms"]) {
                    if (platform in Platforms) {
                        platforms.push(platform);
                    }
                }
            }
            else {
                platforms = this.default_platforms;
            }
            let tests = [];
            if (message.content["tests"] != undefined) {
                tests = message.content["tests"];
            }
            else {
                tests = this.default_tests;
            }
            let pool = null;
            if (message.content["pool"] != undefined) {
                pool = "default";
            }
            else {
                pool = message.content["pool"];
            }
            if (this.pools.findIndex((p) => p.id == pool) == -1) {
                this.createPool(pool);
            }
            this.createJob(message.content["adapter_id"], message.content["build"], platforms, pool, tests).start();
        }
    }
    ;
    poolCount() {
        return this.pools.length;
    }
    ;
    jobCount() {
        return this.jobs.length;
    }
    ;
    adapterCount() {
        return this.adapters.length;
    }
    ;
    process() {
        this.transport.process();
        // Let adapters poll
        for (let adapter of this.adapters) {
            adapter.process();
        }
        // Pump tasks
        for (let pool of this.pools) {
            pool.process();
        }
        // Prune finished jobs
        for (let job of this.jobs) {
            if (job.isFinished()) {
                let index = this.jobs.indexOf(job);
                this.jobs.splice(index, 1);
            }
        }
    }
    ;
    createPool(name, limit = 100) {
        let pool = new Pool(name, this.transport, limit);
        this.pools.push(pool);
        return pool;
    }
    ;
    newStorage() {
        let store = new TmpStorage();
        this.stores.push(store);
        return store.path;
    }
    ;
    selectPool(name) {
        let selected_pool = null;
        for (let pool of this.pools) {
            if (pool.id == name) {
                selected_pool = pool;
                break;
            }
        }
        if (selected_pool == null) {
            selected_pool = this.createPool(name);
        }
        return selected_pool;
    }
    ;
    createJob(adapter_id, build, platforms, poolname, tests) {
        let job = new Job(this.transport, build, adapter_id, platforms, this.selectPool(poolname), this.newStorage(), tests);
        this.jobs.push(job);
        return job;
    }
    ;
    registerAdapter(adapter) {
        this.adapters.push(adapter);
    }
    ;
}
;
//# sourceMappingURL=proteuscore.js.map