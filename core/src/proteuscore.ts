import {Job} from "core/job";
import {Pool} from "core/pool";
import {Message, MessageTransport, TransportClient, ArrayFromJSON} from 'common/messagetransport';
import {Partitions, WorkerChannels, JobChannels, SystemChannels} from 'common/protocol';
import {Platforms} from "common/platforms";
import {TestComponent} from "common/testcomponents";
import { Adapter } from "core/adapter";

import { get } from "config";
import archiver from 'archiver';
import express from 'express';

export class ProteusCore implements TransportClient
{
    protected adapters:Adapter[]
    protected jobs:Job[];
    protected pools:Pool[];
    protected workers:Worker[];
    protected storage:Storage[];
    protected file_access:any;
    protected http_server:any;

    constructor(public transport:MessageTransport)
    {
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
        this.jobs = [];
        this.pools = [];
        this.adapters = [];
        this.storage = [];
        this.createPool("default");
        this.http_server = express();
        this.http_server.get('/:id', (req, res) =>
        {
            let store = this.storage.find((s) => s.id == req.params.id);
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
        this.file_access = this.http_server.listen(get("Files.Port"));
        this.transport.sendMessage(Partitions.SYSTEM, SystemChannels.START, null, {status: "Core Up"});
    };

    public onMessage(message:Message)
    {
        switch(message.partition)
        {
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
            job.process();
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

    public registerAdapter(adapter:Adapter)
    {
        this.adapters.push(adapter);
    };

    public registerJob(job:Job)
    {

    };

    public registerWorker(worker:Worker)
    {

    };

    public close()
    {
        this.http_server.close();
        for(let store of this.storage)
        {
            store.finish();
        }
    };
};
