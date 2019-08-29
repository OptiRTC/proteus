import uuid from "uuidv4";

export class UniqueID
{
    public id:string;

    constructor()
    {
        this.id = uuid();
    };
};
