import { MQTTClient } from 'worker/mqttclient';
import { get } from 'config';

let worker = new MQTTClient(get('Core.MessageServer'));
worker.run();
