import {Job} from "./job";
import {Pool} from "./pool";
import {Message, MessageTransport, TransportClient} from "./messagetransport";
import {Partitions, WorkerChannels, JobChannels} from "./protocol";
import {Platforms} from "./platforms";
import {TmpStorage} from "./storage";
import {TestComponent} from "./testcomponents";

export class ProteusCore implements TransportClient
{
    private jobs:Job[];
    private pools:Pool[];
    private default_pool:Pool;
    private default_platforms:Platforms[];
    private default_tests:TestComponent[];
    private stores:TmpStorage[];

    constructor(public transport:MessageTransport)
    {
        this.createPool("default");
        this.transport.subscribe(this, Partitions.JOBS, null, null);
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
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
                message.content["source"],
                platforms,
                message.content["pool"] ? message.content["pool"] : this.default_pool,
                tests);
        } else if (message.channel == JobChannels.RESULT) {

        }
    };

    public process()
    {
        for (let pool of this.pools)
        {
            pool.process();
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

    private createJob(source:string, platforms:Platforms[], poolname:string, tests:TestComponent[])
    {
        let job = new Job(
            this.transport,
            source,
            platforms,
            this.selectPool(poolname),
            this.newStorage(),
            tests);
        this.jobs.push(job);
        return job;
    };W
};