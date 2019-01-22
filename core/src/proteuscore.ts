import {Job} from "job";
import {Pool} from "pool";
import {Message, MessageTransport, TransportClient} from "messagetransport";
import {Partitions, WorkerChannels, AdapterChannels, SystemChannels} from "protocol";
import {Platforms} from "platforms";
import {TmpStorage} from "storage";
import {TestComponent} from "testcomponents";
import { Adapter } from "adapter";

export class ProteusCore implements TransportClient
{
    private jobs:Job[];
    private pools:Pool[];
    private default_pool:Pool;
    private default_platforms:Platforms[];
    private default_tests:TestComponent[];
    private stores:TmpStorage[];
    private adapters:Adapter[];

    constructor(public transport:MessageTransport)
    {
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

    public onMessage(message:Message)
    {
        switch(message.partition)
        {
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
    };

    public handleSystemMessage(message:Message)
    {
        switch(message.channel)
        {
            case SystemChannels.STORAGE:
                let store = new TmpStorage();
                this.stores.push(store);
                this.transport.sendMessage(new Message(
                    Partitions.ADAPTER,
                    AdapterChannels.STORAGEREADY,
                    message.address,
                    store));
                break;
            default:
                break;
        }
    };

    public handleWorkerDiscovery(message:Message)
    {
        this.selectPool(message.content['pool']).discoverWorker(message);
    };

    public handleJobMessage(message:Message)
    {
        if (message.address == '0')
        {
            let platforms = [];
            if (message.content["platforms"] != undefined)
            {
                // Should be an array of strings
                for (let platform of message.content["platforms"])
                {
                    if (platform in Platforms)
                    {
                        platforms.push(platform);
                    }
                }
            } else {
                platforms = this.default_platforms;
            }

            let tests = [];
            if (message.content["tests"] != undefined)
            {
                tests = message.content["tests"];
            } else {
                tests = this.default_tests;
            }

            this.createJob(
                message.content["adapter_id"],
                message.content["build"],
                platforms,
                message.content["pool"] ? message.content["pool"] : this.default_pool,
                tests);
        }
    };

    public process()
    {
        // Let adapters poll
        for (let adapter of this.adapters)
        {
            adapter.process();
        }

        // Pump tasks
        for (let pool of this.pools)
        {
            pool.process();
        }

        // Prune finished jobs
        for (let job of this.jobs)
        {
            if (job.isFinished())
            {
                let index = this.jobs.indexOf(job);
                this.jobs.splice(index, 1);
            }
        }
    };

    private createPool(name:string, limit:number = 100):Pool
    {
        let pool = new Pool(
            name,
            this.transport,
            limit);
        this.pools.push(pool);
        return pool;
    };

    private newStorage():string
    {
        let store = new TmpStorage();
        this.stores.push(store);
        return store.path;
    };

    private selectPool(name:string):Pool
    {
        let selected_pool = null;
        for(let pool of this.pools)
        {
            if (pool.id == name)
            {
                selected_pool = pool;
                break;
            }
        }

        if (selected_pool == null)
        {
            selected_pool = this.createPool(name);
        }
        return selected_pool;
    };

    private createJob(adapter_id:string, build:string, platforms:Platforms[], poolname:string, tests:TestComponent[])
    {
        let job = new Job(
            this.transport,
            build,
            adapter_id,
            platforms,
            this.selectPool(poolname),
            this.newStorage(),
            tests);
        this.jobs.push(job);
        return job;
    };

    public registerAdapter(adapter:Adapter)
    {
        this.adapters.push(adapter);
    };
};
