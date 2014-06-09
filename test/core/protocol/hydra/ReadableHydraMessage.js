/// <reference path='../../../test.d.ts' />
require('should');

var ReadableHydraMessage = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessage');

describe('CORE --> PROTOCOL --> HYDRA --> ReadableHydraMessage', function () {
    it('should correctly deformat the hydra message', function () {
        var msg = new ReadableHydraMessage(new Buffer([0x02, 0x45, 0xef, 0xa1]));

        msg.getMessageType().should.equal('CREATE_CELL_ADDITIVE');
        msg.getPayload().toString('hex').should.equal('45efa1');
    });

    it('should throw an error when passing in an empty buffer', function () {
        (function () {
            new ReadableHydraMessage(new Buffer(0));
        }).should.throw();
    });

    it('should throw an error when passing in an unknown message type', function () {
        (function () {
            new ReadableHydraMessage(new Buffer([0xff, 0x1]));
        }).should.throw();
    });

    it('should correctly return an empty buffer if the payload is zero', function () {
        var msg = new ReadableHydraMessage(new Buffer([0x02]));

        msg.getPayload().length.should.equal(0);
    });
});
//# sourceMappingURL=ReadableHydraMessage.js.map
