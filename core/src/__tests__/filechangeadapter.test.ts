import { TmpStorage } from 'storage';
import { FileChangeAdapter } from 'filechangeadapter';
import { Message, TransportClient, MessageTransport } from 'messagetransport';
import { Partitions, SystemChannels } from 'protocol';
import { writeFileSync } from 'fs';

test('changed file triggers STORAGE request', done => {
	class StorageListener implements TransportClient {
		public called:boolean;
		constructor()
		{
			this.called = false;
		}
		public onMessage(message:Message)
		{
			this.called = true;
			expect(message.address).toBe(adapter.id);
			expect(message.channel).toBe(SystemChannels.STORAGE);
			done();
		};
	};
	let transport = new MessageTransport();
	let listener = new StorageListener();
	transport.subscribe(listener, Partitions.SYSTEM, null, null);
	let buildstore = new TmpStorage();
	let resultstore = new TmpStorage();
	let adapter = new FileChangeAdapter(
		transport,
		buildstore.path,
		resultstore.path);

	// Create a file
	setTimeout(() => writeFileSync(buildstore.path + "/tests.json", '{"build":"test"}'), 1000);
	setInterval(() => {
		transport.processAll();
	}, 100);
});
