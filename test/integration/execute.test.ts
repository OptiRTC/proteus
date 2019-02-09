import { TransportClient, Message } from 'common/messagetransport';
import { ProteusCore } from 'core/proteuscore';
import { MQTTTransport } from 'common/mqtttransport';
import { FileChangeAdapter } from 'core/filechangeadapter';
import { AppveyorAdapter } from 'core/appveyoradapter';
import { Partitions, TaskChannels } from 'common/protocol';
import { get } from 'config';

test("MQTT + Appveyor + Local FS", done => {
    class TestListener implements TransportClient {
        onMessage(message:Message) {
            clearInterval(interval);
            core.close();
            done();
        }
    };

    let mqtt = new MQTTTransport(get('Core.MessageServer'));
    let core = new ProteusCore(mqtt);
    let listener = new TestListener();
    mqtt.subscribe(listener, Partitions.TASKS, TaskChannels.RESULT, null);
     
    let fsadapter = new FileChangeAdapter(mqtt, '/tmp/proteus/job', '/tmp/proteus/result');
    let avadapter = new AppveyorAdapter(mqtt);

    core.registerAdapter(fsadapter);
    core.registerAdapter(avadapter);
   
    let interval = setInterval(() => core.process(), 10);
}, 60000);