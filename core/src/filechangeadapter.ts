import { Adapter } from "core/adapter";
import { writeFileSync } from 'fs';
import { TestCaseResults } from "common/result";
import { ncp } from 'ncp';
import { watch, FSWatcher } from 'chokidar';
import { existsSync, mkdirSync } from 'fs';
import { ProteusCore } from "core/proteuscore";

export class FileChangeAdapter extends Adapter
{
    /* tslint:disable:no-unused-variable */
    protected debounce:NodeJS.Timeout;
    protected watcher:FSWatcher;

    constructor(
        public buildpath:string,
        public resultspath:string,
        parent:ProteusCore)
    {
        super("Watch:" + buildpath, parent);
        this.debounce = null;

        if (!existsSync(this.buildpath))
        {
            mkdirSync(this.buildpath, {recursive: true});
        }

        if (!existsSync(this.resultspath))
        {
            mkdirSync(this.resultspath, { recursive: true});
        }

        this.watcher = watch(this.buildpath, {
            ignoreInitial: true
        });
        this.watcher
            .on('add', (e, p) => this.onChange())
            .on('change', (e, p) => this.onChange());

        this.watcher.on('error', e => {
            throw e;
        });
    };

    public getBuild():string
    {
        // Look for metadata.json
        return "local_build";
    };

    public onChange()
    {
        if (!this.debounce)
        {
            this.debounce = setTimeout(() => {
                console.log("New local job");
                let storage = this.parent.createStorage();
                new Promise<void>((resolve, reject) => {
                    ncp(this.buildpath, storage.path, { clobber: true }, (err) => {
                        if (!err)
                        {
                            resolve();
                        } else {
                            reject(err);
                        }
                    });
                }).then(() => this.startJob(storage))
                .catch(e => console.log(e));
                this.debounce = null;
            }, 20000);
        }
    };

    public handleResults(results:TestCaseResults[])
    {
        // Upload Test to URL
        let name = "tests-" + results[0].task.build + "-" + (new Date().getTime());
        if (!existsSync(this.resultspath))
        {
            mkdirSync(this.resultspath, {recursive: true});
        }
        writeFileSync(this.resultspath + "/" + name + '.xml', JSON.stringify(results));
    };
};
