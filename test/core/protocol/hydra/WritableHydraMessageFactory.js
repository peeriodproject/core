/// <reference path='../../../test.d.ts' />
require('should');

var WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> WritableHydraMessageFactory', function () {
    it('should correctly construct a valid hydra message with a given length', function () {
        var factory = new WritableHydraMessageFactory();

        factory.constructMessage('ADDITIVE_SHARING', new Buffer([0x01, 0x02]), 2).toString('hex').should.equal('010102');
    });

    it('should correctly construct a valid hydra message without a given length', function () {
        var factory = new WritableHydraMessageFactory();

        factory.constructMessage('ADDITIVE_SHARING', new Buffer([0x01, 0x02])).toString('hex').should.equal('010102');
    });

    it('should throw an error if it does not recognize the message type', function () {
        var factory = new WritableHydraMessageFactory();

        (function () {
            factory.constructMessage('FOOBAR', new Buffer(2));
        }).should.throw();
    });

    it('should correctly construct a hydra message with a circuitId', function () {
        var factory = new WritableHydraMessageFactory();

        var buf = factory.constructMessage('ENCRYPTED_DIGEST', new Buffer('1111', 'hex'), 2, 'cafebabecafebabecafebabecafebabe');

        buf.toString('hex').should.equal('04cafebabecafebabecafebabecafebabe1111');
    });
});
//# sourceMappingURL=WritableHydraMessageFactory.js.map
