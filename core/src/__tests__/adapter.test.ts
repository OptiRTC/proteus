import { Adapter } from 'adapter';
import { Message, TransportClient, MessageTransport } from 'messagetransport';
import { TmpStorage } from 'storage';
import { Partitions, JobChannels, AdapterChannels } from 'protocol';
import { writeFileSync } from 'fs';

test('Adapter getBuild', () => {
	let transport = new MessageTransport();
    let adapter = new Adapter(transport, 'testadapter');

    expect(adapter.getBuild()).toContain("unknown-");

});

test('Adapter STORAGEREADY fires loadJob', done => {

	class JobListener implements TransportClient
	{
		public called:boolean;
		constructor()
		{
			this.called = false;
		}

		public onMessage(message:Message)
		{
			expect(message.channel).toBe(JobChannels.NEW);
			expect(message.address).toBe(adapter.id);
			expect(message.content.adapter_id).toEqual(adapter.id);
			expect(message.content.test).toEqual("test");
			this.called = true;
			done();
		};
	};

	let transport = new MessageTransport();
	let test_listener = new JobListener();
	transport.subscribe(test_listener, Partitions.JOBS, JobChannels.NEW, null);
	let adapter = new Adapter(transport, 'testadapter');

	let config = {"test": "test" };
	let store = new TmpStorage();
	writeFileSync(store.path + "/tests.json", JSON.stringify(config));
	transport.sendMessage(Partitions.ADAPTER, AdapterChannels.STORAGEREADY, adapter.id, store);
	while(!test_listener.called) {transport.processAll();}
});
