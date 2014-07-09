/// <reference path='../../../test.d.ts' />
require('should');

var WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> WritableFileTransferMessageFactory', function () {
    var factory = new WritableFileTransferMessageFactory();

    it('should correctly format the message', function () {
        var expected = Buffer.concat([new Buffer('cafebabecafebabecafebabecafebabe', 'hex'), new Buffer([0x01]), new Buffer('foobar')]);

        var actual = factory.constructMessage('cafebabecafebabecafebabecafebabe', 'QUERY_BROADCAST', new Buffer('foobar'));

        actual.length.should.equal(expected.length);

        for (var i = 0; i < actual.length; i++) {
            actual[i].should.equal(expected[i]);
        }
    });

    it('should throw the errors', function () {
        (function () {
            factory.constructMessage('cafebabe', 'QUERY_BROADCAST', new Buffer('foobar'));
        }).should.throw();

        (function () {
            factory.constructMessage('cafebabecafebabecafebabecafebabe', 'FOOBAR', new Buffer('foobar'));
        }).should.throw();
    });
});
//# sourceMappingURL=WritableFileTransferMessageFactory.js.map
