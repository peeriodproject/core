/// <reference path='../../../test.d.ts' />
require('should');

var ReadableFileTransferMessage = require('../../../../src/core/protocol/fileTransfer/messages/ReadableFileTransferMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ReadableFileTransferMessage', function () {
    it('should correctly deformat the message', function () {
        var buf = Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0x01]), new Buffer('foobar')]);

        var msg = new ReadableFileTransferMessage(buf);

        msg.getPayload().toString().should.equal('foobar');
        msg.getMessageType().should.equal('QUERY_BROADCAST');
        msg.getTransferId().should.equal('cafebabecafebabecafebabecafebabe');
    });

    it('should throw the errors', function () {
        (function () {
            new ReadableFileTransferMessage(Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0xff]), new Buffer('foobar')]));
        }).should.throw();

        (function () {
            new ReadableFileTransferMessage(Buffer.concat([new Buffer('cafebabecafebabecafebabecafebab', 'hex'), new Buffer([0x01])]));
        }).should.throw();
    });
});
//# sourceMappingURL=ReadableFileTransferMessage.js.map
