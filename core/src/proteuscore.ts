import {Job} from "core/job";
import {Pool} from "core/pool";
import {Message, MessageTransport, TransportClient } from 'common/messagetransport';
import {Partitions, WorkerChannels, SystemChannels, TaskChannels} from 'common/protocol';
import { Adapter } from "core/adapter";
import { Worker, WorkerState } from "common/worker";
import { Task } from "common/task";

import { get } from "config";
import archiver from 'archiver';
import express from 'express';
import { TestCaseResults } from "common/result";
import { ProteusStorage } from "common/storage";

export class ProteusCore implements TransportClient
{
    // Owned components
    protected adapters:Adapter[]
    protected jobs:Job[];
    protected pools:Pool[];
    protected workers:Worker[];
    protected storage:ProteusStorage[];

    protected file_access:any;
    protected http_server:any;

    constructor(public transport:MessageTransport)
    {
        this.transport.subscribe(this, Partitions.WORKERS, WorkerChannels.DISCOVER, null);
        this.transport.subscribe(this, Partitions.TASKS, null, null);
        this.jobs = [];
        this.pools = [];
        this.adapters = [];
        this.storage = [];
        this.workers = [];
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
                this.handleWorkerMessage(message);
                break;
            case Partitions.TASKS:
                this.handleTaskMessage(message);
                break;
            default:
                break;
        }
    };

    public handleTaskMessage(message:Message)
    {
        switch(message.channel)
        {
            case TaskChannels.RESULT:
                let result = new TestCaseResults();
                result.fromJSON(message.content);
                let job = this.findJobByTask(result.task);
                if (job != null)
                {
                    job.addResult(result);
                }         
                break;
            case TaskChannels.ERROR:        
                break;

        }
    };

    public handleWorkerMessage(message:Message)
    {
        switch(message.channel)
        {
            case WorkerChannels.DISCOVER:
                this.handleWorkerDiscovery(message);
                break;
            default:
                let worker = this.findWorker(message.address);
                if (worker != null)
                {
                    worker.onMessage(message);
                }
                break;
        }
    };

    public handleWorkerDiscovery(message:Message)
    {
        // Find existing worker
        if (typeof(message.address) == 'undefined')
        {
            return;
        }

        if (typeof(message.content.pool) == 'undefined')
        {
            message.content.pool = "default";
        }

        let worker = this.findWorker(message.address);
        let pool = this.findPool(message.content.pool);

        if (worker == null)
        {
            worker = this.registerWorker(message);
        }

        worker.pool_id = pool.id;
        this.updatePool(worker);
        this.sendWorkerConfig(worker, pool);
    };

    public findWorker(id:string)
    {
        let worker = null;
        for(let candidate of this.workers)
        {
            if (candidate.id == id)
            {
                worker = candidate;
                break;
            }
        }
        return worker;
    };

    public findPool(id:string)
    {
        let pool = null;
        for (let candidate of this.pools)
        {
            if (candidate.id == id)
            {
                pool = candidate;
                break;
            }
        }
        if (pool == null)
        {
            pool = this.createPool(id);
        }
        return pool;
    };

    public findJobByTask(task:Task)
    {
        for(let job of this.jobs)
        {
            if (job.hasTask(task))
            {
                return job;
            }
        }
        return null;
    }

    public updatePool(worker:Worker)
    {
        for(let pool of this.pools)
        {
            if (worker.pool_id == pool.id)
            {
                pool.addWorker(worker);
            } else {
                pool.removeWorker(worker);
            }
        }
    };

    public sendWorkerConfig(worker:Worker, pool:Pool)
    {
        console.log("Sending config to:", worker.id);
        this.transport.sendMessage(
            Partitions.WORKERS,
            WorkerChannels.CONFIG,
            worker.id,
            {"pool_id": pool.id});
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
        // Let adapters work
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
                console.log("Job Finished " + job.id);
                for(let adapter of this.adapters)
                {
                    console.log("Reporting to " + adapter.name);
                    adapter.handleResults(job.results);
                }
                this.freeStorage(job.storage.id);
                let index = this.jobs.indexOf(job);
                this.jobs.splice(index, 1);
            }
        }
    };

    protected createPool(id:string, limit:number = 100):Pool
    {
        let pool = new Pool(
            id,
            limit);
        this.pools.push(pool);
        return pool;
    };

    public createStorage():ProteusStorage
    {
        let storage = new ProteusStorage();
        this.storage.push(storage);
        return storage;
    };

    public freeStorage(id:String)
    {
        let idx = this.storage.findIndex((s) => s.id == id);
        if (idx != -1)
        {
            this.storage[idx].finish();
            this.storage.splice(idx, 1);
        }
    };

    public registerAdapter(adapter:Adapter)
    {
        this.adapters.push(adapter);
    };

    public registerJob(job:Job)
    {
        this.jobs.push(job);
        let pool = this.findPool(job.pool_id);
        pool.addJob(job);
        job.start();
    };

    public registerWorker(message:Message)
    {
        let worker = new Worker(
            message.address,
            typeof(message.content.pool) == 'undefined' ? "default" : message.content.pool,
            typeof(message.content.platform) == 'undefined' ? "default" : message.content.platform,
            this.transport,
            typeof(message.content.timeout) == 'undefined' ? 180 : message.content.timeout);
        worker.state = typeof(message.content.state) == 'undefined' ? WorkerState.ERROR : message.content.state;
        this.workers.push(worker);
        return worker;
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
