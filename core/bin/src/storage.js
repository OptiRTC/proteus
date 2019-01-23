import { dir } from 'tmp';
export class TmpStorage {
    constructor() {
        dir({ template: '/tmp/proteus-XXXXXX' }, (err, path, cleanup) => {
            if (err) {
                console.log("Error getting tmp storage");
            }
            this.path = path;
            this.cleanup = cleanup;
        });
    }
    finish() {
        this.cleanup();
        this.path = null;
    }
    ;
}
;
//# sourceMappingURL=storage.js.map