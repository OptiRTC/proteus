import {Job} from "core/job";
import {Pool} from "core/pool";
import {Message, MessageTransport, TransportClient, ArrayFromJSON} from 'common/messagetransport';
import {Partitions, WorkerChannels, AdapterChannels, SystemChannels, JobChannels} from 'common/protocol';
import {Platforms} from "common/platforms";
import {TmpStorage} from "common/storage";
import {TestComponent} from "common/testcomponents";
import { Adapter } from "core/adapter";
import { get } from "config";
import express from 'express';
import { Server } from "http";
import archiver from "archiver";

export class ProteusCore implements TransportClient
{
    protected jobs:Job[];
    protected pools:Pool[];
    protected default_pool:Pool;
    protected default_platforms:Platforms[];
    protected default_tests:TestComponent[];
    protected stores:TmpStorage[];
    protected adapters:Adapter[];
    public file_access:Server;

    constructor(public transport:MessageTransport)
    {
        this.transport.subscribe(this, Partitions.JOBS, null, null);
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
        this.transport.subscribe(this, Partitions.SYSTEM, null, null);
        this.jobs = [];
        this.pools = [];
        this.default_platforms = [];
        this.default_tests = [];
        this.stores = [];
        this.adapters = [];
        let app = express();
        app.get('/:id', (req, res) =>
        {
            let store = this.stores.find((s) => s.id == req.params.id);
            if (store)
            {
                let arch = archiver('zip', { zlib: { level: 9}});
                arch.pipe(res);
                arch.directory(store.path, false);
                arch.finalize();
            } else {
                res.status(404).send('Not Found');
            }
        });
        this.file_access = app.listen(get("Files.Port"));
        this.createPool("default");
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
                this.transport.sendMessage(
                    Partitions.ADAPTER,
                    AdapterChannels.STORAGEREADY,
                    message.address,
                    store);
                break;
            case SystemChannels.RELEASESTORAGE:
                let index = this.stores.findIndex((s) => s.path == message.content);
                if (index != -1)
                {
                    this.stores[index].finish();
                    this.stores.splice(index, 1);
                }
                break;
            default:
                break;
        }
    };

    public handleWorkerDiscovery(message:Message)
    {
        this.selectPool(message.content.pool).discoverWorker(message);
    };

    public handleJobMessage(message:Message)
    {
        if (message.channel == JobChannels.NEW)
        {
            let platforms = [];
            if (message.content.platforms != undefined)
            {
                // Should be an array of strings
                for (let platform of message.content.platforms)
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
            if (message.content.tests != undefined)
            {
                tests = ArrayFromJSON<TestComponent>(TestComponent, message.content.tests);
            } else {
                tests = this.default_tests;
            }

            this.createJob(
                message.content.adapter_id,
                message.content.build,
                platforms,
                message.content.pool_id,
                tests).start();
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

    protected newStorage():string
    {
        let store = new TmpStorage();
        this.stores.push(store);
        return store.id;
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

    protected createJob(adapter_id:string, build:string, platforms:Platforms[], poolname:string, tests:TestComponent[])
    {
        let job = new Job(
            this.transport,
            build,
            adapter_id,
            platforms,
            this.selectPool(poolname).id,
            this.newStorage(),
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
        this.file_access.close();
    };
};
