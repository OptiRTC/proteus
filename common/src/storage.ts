
import {dirSync, SynchrounousResult} from 'tmp';
import { promises as fs, existsSync } from 'fs';

export class ProteusStorage
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

	public async finish()
	{
		let asyncRemove = async function(path)
		{
			if (existsSync(path))
			{
				let subpaths = await fs.readdir(path);
				for await (let file of subpaths)
				{
					let curpath = path + "/" + file;
					let stats = await fs.lstat(curpath);
					
					if (stats.isDirectory())
					{
						await asyncRemove(curpath);
						await fs.rmdir(curpath);
					} else {
						await fs.unlink(curpath);
					}
				}
			}
		};
		asyncRemove(this.obj.name)
		.then(() => this.obj.removeCallback());
	}
};
