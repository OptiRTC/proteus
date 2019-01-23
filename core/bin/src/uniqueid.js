export class UniqueID {
    constructor() {
        let rng = 0;
        while (rng == 0)
            rng = Math.random();
        this.id = '' + rng.toString(36);
    }
    ;
}
;
//# sourceMappingURL=uniqueid.js.map