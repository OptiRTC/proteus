
import {dirSync, SynchrounousResult} from 'tmp';

export class Storage
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

	public finish()
	{
		this.obj.removeCallback();
	}
};
