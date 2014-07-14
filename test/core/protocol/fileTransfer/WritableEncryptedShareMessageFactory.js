/// <reference path='../../../test.d.ts' />
require('should');

var WritableEncryptedShareMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableEncryptedShareMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> WritableEncryptedShareMessageFactory', function () {
    var factory = new WritableEncryptedShareMessageFactory();

    it('should correctly construct the ENCRYPTED_SHARE payload', function () {
        var buff = factory.constructMessage('SHARE_ABORT', new Buffer('foobar'));

        buff.toString('hex').should.equal('01666f6f626172');
    });

    it('should throw an error when the message type is unknown', function () {
        (function () {
            factory.constructMessage('FOOBAR', new Buffer('foo'));
        }).should.throw('WritableEncryptedShareMessageFactory: Unknown message type!');
    });
});
//# sourceMappingURL=WritableEncryptedShareMessageFactory.js.map
