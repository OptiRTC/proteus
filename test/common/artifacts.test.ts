import { MessageTransport } from 'common/messagetransport';
import { Artifacts } from 'common/artifacts';
import request from 'request';

test("Artifact Connection", done => {
    let transport = new MessageTransport();
    let art = new Artifacts(transport);
    let id = art.newStorage();
    request('http://localhost:3000/' + id, (err, res, body) => {
        art.close();
        expect(err).toBeFalsy();
        expect(res.statusCode).toBe(200);
        done();
    });
});
