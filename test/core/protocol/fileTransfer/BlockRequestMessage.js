/// <reference path='../../../test.d.ts' />
require('should');

var ReadableBlockRequestMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableBlockRequestMessage');
var WritableBlockRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableBlockRequestMessageFactory');
var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> BlockRequestMessage (readable and writable)', function () {
    it('should correctly construct and deformat the a BLOCK_REQUEST message', function () {
        var feedingNodesBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

        var factory = new WritableBlockRequestMessageFactory();

        var buf = factory.constructMessage(feedingNodesBlock, 102456, 'cafebabecafebabecafebabecafebabe');

        var msg = new ReadableBlockRequestMessage(buf);

        msg.getFeedingNodesBlock().toString('hex').should.equal(feedingNodesBlock.toString('hex'));
        msg.getFirstBytePositionOfBlock().should.equal(102456);
        msg.getNextTransferIdentifier().should.equal('cafebabecafebabecafebabecafebabe');
    });

    it('should throw an error when creating a writable message and the identifier has a bad length', function () {
        var feedingNodesBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

        var factory = new WritableBlockRequestMessageFactory();

        (function () {
            factory.constructMessage(feedingNodesBlock, 102456, 'cafebabecafebabecafebabecafeba');
        }).should.throw('WritableBlockRequestMessageFactory: Transfer identifier bad length. Expected 16 bytes in hexadecimal string representation.');
    });
});
//# sourceMappingURL=BlockRequestMessage.js.map
