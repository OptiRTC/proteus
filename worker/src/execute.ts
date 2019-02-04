import { MQTTClient } from 'worker/mqttclient';

let worker = new MQTTClient("proteuscore.localdomain");
worker.run();
