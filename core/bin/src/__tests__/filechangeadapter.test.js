import { TmpStorage } from 'storage';
import { FileChangeAdapter } from 'filechangeadapter';
import { MessageTransport } from 'messagetransport';
import { Partitions, SystemChannels } from 'protocol';
import { writeFileSync } from 'fs';
test('changed file triggers STORAGE request', done => {
    class StorageListener {
        constructor() {
            this.called = false;
        }
        onMessage(message) {
            this.called = true;
            expect(message.address).toBe(adapter.id);
            expect(message.channel).toBe(SystemChannels.STORAGE);
            done();
        }
        ;
    }
    ;
    let transport = new MessageTransport();
    let listener = new StorageListener();
    transport.subscribe(listener, Partitions.SYSTEM, null, null);
    let buildstore = new TmpStorage();
    let resultstore = new TmpStorage();
    let adapter = new FileChangeAdapter(transport, buildstore.path, resultstore.path);
    // Create a file
    setTimeout(() => writeFileSync(buildstore.path + "/tests.json", '{"build":"test"}'), 1000);
    setInterval(() => {
        transport.processAll();
    }, 100);
});
//# sourceMappingURL=filechangeadapter.test.js.map