export class UniqueID
{
    public id:string;

    constructor()
    {
        let rng = 0;
        while(rng == 0) rng = Math.random();
        this.id = '' + rng.toString(36);
    };
};
