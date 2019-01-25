import {dirSync, SynchrounousResult} from 'tmp';

export class TmpStorage
{
	public obj:SynchrounousResult;

	constructor()
	{
		this.obj = dirSync({template: '/tmp/proteus-XXXXXX'});
	}

	get path():string
	{
		return this.obj.name;
	}

	finish()
	{
		this.obj.removeCallback();
	};
};
