/// <reference path='../../../test.d.ts' />
var crypto = require('crypto');

require('should');

var ReadableCellCreatedRejectedMessage = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessage');

describe('CORE --> PROTOCOL --> HYDRA --> ReadableCellCreatedRejectedMessage', function () {
    it('should correctly deformat a non-rejected message', function () {
        var dhPart = crypto.randomBytes(256);
        var secretHash = crypto.randomBytes(20);
        var uuidBuf = crypto.randomBytes(16);

        var msg = new ReadableCellCreatedRejectedMessage(Buffer.concat([uuidBuf, secretHash, dhPart], 292));

        msg.isRejected().should.be.false;
        msg.getDHPayload().toString('hex').should.equal(dhPart.toString('hex'));
        msg.getSecretHash().toString('hex').should.equal(secretHash.toString('hex'));
        msg.getUUID().should.equal(uuidBuf.toString('hex'));
    });

    it('should throw an error when the DH part has bad length', function () {
        var dhPart = crypto.randomBytes(255);
        var secretHash = crypto.randomBytes(20);
        var uuidBuf = crypto.randomBytes(16);

        (function () {
            var msg = new ReadableCellCreatedRejectedMessage(Buffer.concat([uuidBuf, secretHash, dhPart], 291));
        }).should.throw('ReadableCellCreatedRejectedMessage: Diffie-Hellman bad length!');
    });

    it('should correctly deformat a rejected message', function () {
        var uuidBuf = crypto.randomBytes(16);

        var msg = new ReadableCellCreatedRejectedMessage(uuidBuf);

        msg.isRejected().should.be.true;
        msg.getUUID().should.equal(uuidBuf.toString('hex'));
    });

    it('should throw an error when the message is too short', function () {
        (function () {
            new ReadableCellCreatedRejectedMessage(new Buffer(15));
        }).should.throw('ReadableCellCreatedRejectedMessage: Message too short!');
    });
});
//# sourceMappingURL=ReadableCellCreatedRejectedMessage.js.map
