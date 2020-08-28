import {Job} from "core/job";
import {Pool} from "core/pool";
import {Message, MessageTransport, TransportClient, ArrayFromJSON} from 'common/messagetransport';
import {Partitions, WorkerChannels, JobChannels, SystemChannels} from 'common/protocol';
import {Platforms} from "common/platforms";
import {TestComponent} from "common/testcomponents";
import { Adapter } from "core/adapter";
import { Artifacts } from 'common/artifacts';

export class ProteusCore implements TransportClient
{
    protected jobs:Job[];
    protected pools:Pool[];
    protected default_pool:Pool;
    protected default_platforms:Platforms[];
    protected default_tests:TestComponent[];
    protected adapters:Adapter[];
    protected artifacts:Artifacts;
    protected status_interval:any;

    constructor(public transport:MessageTransport)
    {
        this.transport.subscribe(this, Partitions.JOBS, null, null);
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
        this.jobs = [];
        this.pools = [];
        this.default_platforms = [];
        this.default_tests = [];
        this.adapters = [];
        this.artifacts = new Artifacts(transport);
        this.createPool("default");
        this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.START, null, {status: "Core Up"});
        this.status_interval = setInterval(() => this.sendStatus(), 15000);
    };

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
        let pool = "default";
        if (message.content != null)
        {
            pool = message.content.pool;
        }
        this.selectPool(pool).discoverWorker(message);
    };

    public handleJobMessage(message:Message)
    {
        if (message.channel == JobChannels.NEW)
        {
            let platforms = [];
            for(let description of message.content.test_list)
            {       
                if (description.platforms != undefined)
                {
                    // Should be an array of strings
                    for (let platform of description.platforms)
                    {
                        platform = platform.toLowerCase();
                        if (Object.values(Platforms).includes(platform))
                        {
                            platforms.push(platform);
                        }
                    }
                } else {
                    platforms = this.default_platforms;
                }

                let tests = [];
                if (description.tests != undefined)
                {
                    tests = ArrayFromJSON<TestComponent>(TestComponent, description.tests);
                } else {
                    tests = this.default_tests;
                }

                if (tests.length > 0)
                {
                    this.createJob(
                        message.content.adapter_id,
                        message.content.build,
                        platforms,
                        description.pool,
                        tests,
                        message.content.store_id).start();
                }
            }
        }
    };

    public poolCount():number
    {
        return this.pools.length;
    };

    public jobCount():number
    {
        return this.jobs.length;
    };

    public adapterCount():number
    {
        return this.adapters.length;
    };

    public process()
    {
        this.transport.process();
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

    protected createPool(id:string, limit:number = 100):Pool
    {
        let pool = new Pool(
            id,
            this.transport,
            limit);
        this.pools.push(pool);
        return pool;
    };

    protected selectPool(id:string):Pool
    {
        if (typeof(id) == 'undefined' || id == null)
        {
            id = "default";
        }
        let selected_pool = null;
        for(let pool of this.pools)
        {
            if (pool.id == id)
            {
                selected_pool = pool;
                break;
            }
        }

        if (selected_pool == null)
        {
            selected_pool = this.createPool(id);
        }
        return selected_pool;
    };

    protected createJob(adapter_id:string, build:string, platforms:Platforms[], poolname:string, tests:TestComponent[], store_id:string)
    {
        if (store_id == undefined ||
            store_id == null)
        {
            store_id = this.artifacts.newStorage();
        }
        let job = new Job(
            this.transport,
            build,
            adapter_id,
            platforms,
            this.selectPool(poolname).id,
            store_id,
            tests);
        this.jobs.push(job);
        return job;
    };

    public registerAdapter(adapter:Adapter)
    {
        this.adapters.push(adapter);
    };

    public close()
    {
        this.artifacts.close();
    };

    public statusPayload()
    {
        let payload = {
            artifacts: [],
            adapters: [],
            default_tests: this.default_tests,
            default_platforms: this.default_platforms,
            default_pool: this.default_pool,
            jobs: [],
            pools: []
            
        };

        console.log(`Defaults POOL: ${this.default_pool}, PLATFORM: ${this.default_platforms}, TESTS: ${this.default_tests}`);

        for(let job of this.jobs)
        {
            payload.jobs.push(job.statusPayload());
        }

        for(let adapter of this.adapters)
        {
            payload.adapters.push(adapter.statusPayload());
        }

        for(let pool of this.pools)
        {
            payload.pools.push(pool.statusPayload());
        }
        return payload;
    };

    public sendStatus()
    {
        this.statusPayload();
        /*this.transport.sendMessage(
            Partitions.SYSTEM,
            SystemChannels.STATUS,
            null,
            payload);*/
    };
};
