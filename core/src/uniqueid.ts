export class UniqueID
{
    public id:string;

    constructor()
    {
        this.id = '' + Math.random().toString(36);
    };
};
