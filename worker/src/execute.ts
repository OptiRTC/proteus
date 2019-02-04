import { MQTTClient } from 'worker/mqttclient';
import { get } from 'config';

let worker = new MQTTClient(get('Core.Server'));
worker.run();
