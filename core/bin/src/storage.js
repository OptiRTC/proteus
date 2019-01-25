import { dirSync } from 'tmp';
export class TmpStorage {
    constructor() {
        this.obj = dirSync({ template: '/tmp/proteus-XXXXXX' });
    }
    get path() {
        return this.obj.name;
    }
    finish() {
        this.obj.removeCallback();
    }
    ;
}
;
//# sourceMappingURL=storage.js.map