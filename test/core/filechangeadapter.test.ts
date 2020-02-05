import { Storage } from 'common/storage';
import { FileChangeAdapter } from 'core/filechangeadapter';
import { Message, TransportClient, MessageTransport } from 'common/messagetransport';
import { Partitions, SystemChannels } from 'common/protocol';
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
	let listener = new ProteusStorageListener();
	transport.subscribe(listener, Partitions.SYSTEM, null, null);
	let buildstore = new ProteusStorage();
	let resultstore = new ProteusStorage();
	let adapter = new FileChangeAdapter(
		transport,
		buildstore.path,
		resultstore.path);

	// Create a file
	setTimeout(() => writeFileSync(buildstore.path + "/test.json", '{"build":"test"}'), 1000);
	setInterval(() => {
		transport.processAll();
	}, 100);
}, 20000);
