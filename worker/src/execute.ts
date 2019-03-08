import { MQTTClient } from 'worker/mqttclient';
import { get } from 'config';

process.on('unhandledRejection', (r, p) => {
    console.log('UnandledPromiseRejection', p, 'reason', r);
})

let worker = new MQTTClient(get('Core.MessageServer'));
worker.run();
