/// <reference path='../../test.d.ts' />
require('should');

var BroadcastReadableMessage = require('../../../src/core/protocol/broadcast/messages/BroadcastReadableMessage');
var BroadcastWritableMessageFactory = require('../../../src/core/protocol/broadcast/messages/BroadcastWritableMessageFactory');

describe('CORE --> PROTOCOL --> BROADCAST --> BroadcastWritableMessageFactory', function () {
    it('should correctly format the broadcast message', function () {
        var factory = new BroadcastWritableMessageFactory();

        var msg = new BroadcastReadableMessage(factory.constructPayload('cafebabecafebabe', new Buffer('foobar')));

        msg.getBroadcastId().should.equal('cafebabecafebabe');
        msg.getPayload().toString().should.equal('foobar');
        (Date.now() - msg.getTimestamp()).should.be.below(50);
    });
});
//# sourceMappingURL=BroadcastWritableMessageFactory.js.map
