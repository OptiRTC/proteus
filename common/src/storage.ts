import {dirSync, SynchrounousResult} from 'tmp';

export class TmpStorage
{
	public obj:SynchrounousResult;
	protected id_regexp:RegExp;

	constructor()
	{
		this.obj = dirSync({template: '/tmp/proteus-XXXXXX'});
		this.id_regexp = /(proteus-[A-Za-z0-9]+)/;
	}

	get path():string
	{
		return this.obj.name;
	}

	get  id():string
	{
		let matches = this.id_regexp.exec(this.obj.name);
		return matches[1];
	}

	finish()
	{
		this.obj.removeCallback();
	};
};
