import { MessageTransport, TransportClient, Message } from "messagetransport";
import { Partitions, AdapterChannels, JobChannels } from "protocol";
import { UniqueID } from "uniqueid";
import { Platforms } from "platforms";

export class Adapter extends UniqueID implements TransportClient
{
    constructor(
        public name:string,
        public transport:MessageTransport)
    {
        super();
        this.transport.subscribe(
            this,
            Partitions.ADAPTER,
            null,
            null);
    };

    public onMessage(message:Message)
    {
        switch(message.channel)
        {
            case AdapterChannels.BUILD:
                this.transport.sendMessage(new Message(
                    Partitions.JOBS,
                    JobChannels.NEW,
                    "0",
                    {
                        "platforms": [ Platforms.ELECTRON, Platforms.PHOTON],
                        "tests": [ 
                            {
                                "name" : "suite_1 - hardware tests", // Friendly name
                                "binary": "suite_1.bin", // The binary under test
                                "scenario": null, // The scenario file to load (may be null for uint tests)
                                "expectations": [
                                    "TestPassesAndExits",
                                    "TestIsRunAndNotSkipped"
                                ]
                            }
                        ],
                        "source": "base",
                        "pool": "default"
                    }
                ));
                break;

            case AdapterChannels.RESULT:
                break;

            default:
                break;
        }
    }

    public process()
    {
        // Check CI, Filesystem, etc

    }
}
