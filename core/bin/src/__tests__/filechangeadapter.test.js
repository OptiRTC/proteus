import { TmpStorage } from 'storage';
import { FileChangeAdapter } from 'filechangeadapter';
import { MessageTransport } from 'messagetransport';
import { Partitions, SystemChannels } from 'protocol';
import { writeFileSync } from 'fs';
test('changed file triggers STORAGE request', () => {
    class StorageListener {
        constructor() {
            this.called = false;
        }
        onMessage(message) {
            expect(message.address).toBe(adapter.id);
            expect(message.channel).toBe(SystemChannels.STORAGE);
            this.called = true;
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
    writeFileSync(buildstore.path + "/tests.json", '{"build":"test"}');
    while (!listener.called) { }
});
//# sourceMappingURL=filechangeadapter.test.js.map