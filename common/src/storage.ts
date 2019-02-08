import {dirSync, SynchrounousResult} from 'tmp';
import { ncp } from 'ncp';

export class TmpStorage
{
	public obj:SynchrounousResult;
	public id:string;

	constructor()
	{
		this.obj = dirSync({template: '/tmp/proteus-XXXXXX'});
		this.id = /(proteus-[A-Za-z0-9]+)/.exec(this.obj.name)[1];
	}

	get path():string
	{
		return this.obj.name;
	}

	finish()
	{
		this.obj.removeCallback();
	}

	public copyFrom(source:string): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
           ncp(source, this.path, (err) => {
				if (!err)
				{
					resolve();
				} else {
					reject(err);
				}
			});
        });
    }

	public copyTo(dest:string): Promise<void>
    {
        return new Promise<void>((resolve, reject) => {
           ncp(this.path, dest, (err) => {
				if (!err)
				{
					resolve();
				} else {
					reject(err);
				}
			});
        });
    }
};
