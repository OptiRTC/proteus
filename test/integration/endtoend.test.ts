import { Message, MessageTransport, TransportClient } from 'common/messagetransport';
import { Partitions, WorkerChannels, TaskChannels } from 'common/protocol';
import { TestComponent } from "common/testcomponents";
import { Adapter } from "core/adapter";
import { ProteusCore } from "core/proteuscore";
import { WorkerClient } from 'worker/workerclient';

test('adapter-to-worker', done => {

});

test('abort-test', done => {
    //ensure both worker and core abort the test
    //discard any results from aborted tests
    //ensure aborted worker idles
    //ensure aborted test reported to adapter
});

test('job queue', done => {
    // fill job queues across several pools
    // ensure queues drain correctly
});

test('offline workers', done => {
    // ensure offline workers aren't tasked
    // retask non-aborted jobs to online workers?
});
