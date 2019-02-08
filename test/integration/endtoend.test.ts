import { MessageTransport } from 'common/messagetransport';
import { Adapter } from "core/adapter";
import { ProteusCore } from "core/proteuscore";
import { WorkerClient } from 'worker/workerclient';
import { TmpStorage } from 'common/storage';
import { TestCaseResults } from 'common/result';
import { WorkerState } from 'common/worker';

test('adapter-to-workerclient', done => {
    class TestAdapter extends Adapter
    {
        public done:boolean;
        constructor(transport:MessageTransport, name:string)
        {
            super(transport, name);
            this.done = false;
        };

        public loadJob(store:TmpStorage)
        {
            store.copyFrom('./integration/store').then(() => super.loadJob(store));
        };

        public handleResults(results:TestCaseResults[])
        {
            core.close();
            expect(results.length).toBe(1);
            expect(results[0].passing.length).toBe(4);
            expect(worker.state).toEqual(WorkerState.IDLE);
            clearInterval(interval);
            done();
        };
    };
    let transport = new MessageTransport();
    let worker = new WorkerClient(transport);
    let adapter = new TestAdapter(transport, 'test');
    let core = new ProteusCore(transport);
    core.registerAdapter(adapter);
    transport.processAll();
    adapter.startJob();
    let interval = setInterval(() => {
        transport.process();
        core.process();
    }, 100);
}, 30000);
