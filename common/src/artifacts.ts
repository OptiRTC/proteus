import { Storage } from 'common/storage';
import express from 'express';
import { Server } from "http";
import archiver from 'archiver';
import { get} from 'config';
import { TransportClient, MessageTransport, Message } from 'common/messagetransport';
import { Partitions, SystemChannels, AdapterChannels } from 'common/protocol';

export class Artifacts implements TransportClient
{

    protected stores:Storage[];
    public file_access:Server;
    constructor(public transport:MessageTransport)
    {
        this.stores = [];
        this.transport.subscribe(this, Partitions.SYSTEM, null, null);
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
    }

    public newStorage():string
    {
        let store = new Storage();
        this.stores.push(store);
        return store.id;
    }

    public getStore(store_id:string):Storage
    {
        let index = this.stores.findIndex((s) => s.id == store_id);
        if (index != -1)
        {
            return this.stores[index];
        }
        return null;
    }

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case SystemChannels.STORAGE:
                let store = new Storage();
                this.stores.push(store);
                console.log("Storage Allocated for " + message.address);
                this.transport.sendMessage(
                    Partitions.ADAPTER,
                    AdapterChannels.STORAGEREADY,
                    message.address,
                    {
                        storage_path: store.path,
                        storage_id: store.id
                    });
                break;
            case SystemChannels.RELEASESTORAGE:
                let index = this.stores.findIndex((s) => s.id == message.content);
                if (index != -1)
                {
                    this.stores[index].finish();
                    this.stores.splice(index, 1);
                }
                break;
            default:
                break;
        }
    }

    public close()
    {
        this.file_access.close();
    }
}