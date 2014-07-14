/// <reference path='../../../test.d.ts' />
require('should');

var ReadableBlockMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableBlockMessage');
var WritableBlockMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableBlockMessageFactory');
var FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> BlockMessage (readable and writable)', function () {
    it('should correctly construct and deformat the BLOCK message', function () {
        var feedingNodesBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

        var factory = new WritableBlockMessageFactory();

        var buf = factory.constructMessage(feedingNodesBlock, 123567, 'cafebabecafebabecafebabecafebabe', new Buffer('foobar'));

        var msg = new ReadableBlockMessage(buf);

        msg.getDataBlock().toString().should.equal('foobar');
        msg.getFeedingNodesBlock().toString('hex').should.equal(feedingNodesBlock.toString('hex'));
        msg.getFirstBytePositionOfBlock().should.equal(123567);
        msg.getNextTransferIdentifier().should.equal('cafebabecafebabecafebabecafebabe');
    });

    it('should throw an error if the transfer identifier has a bad length', function () {
        var feedingNodesBlock = FeedingNodesMessageBlock.constructBlock([{ ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe' }]);

        (function () {
            var factory = new WritableBlockMessageFactory();

            factory.constructMessage(feedingNodesBlock, 123567, 'cafebabecafebabecafebabecafeba', new Buffer('foobar'));
        }).should.throw('WritableBlockMessageFactory: Bad next transfer identifier length. Expected 16 bytes.');

        (function () {
            new ReadableBlockMessage(Buffer.concat([feedingNodesBlock, new Buffer(8), new Buffer(10)]));
        }).should.throw('ReadableBlockMessage: Next transfer identifier bad length. Expected 16 bytes.');
    });
});
//# sourceMappingURL=BlockMessage.js.map
