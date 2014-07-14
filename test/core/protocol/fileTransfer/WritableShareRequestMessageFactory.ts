/// <reference path='../../../test.d.ts' />

require('should');

import ReadableShareRequestMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRequestMessage');
import WritableShareRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/WritableShareRequestMessageFactory');
import FeedingNodesMessageBlock = require('../../../../src/core/protocol/fileTransfer/messages/FeedingNodesMessageBlock');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> WritableShareRequestMessageFactory @current', function () {

	it('should correctly create the SHARE_REQUEST payload', function () {
		var hash:string = '770606aff59bca0b045d8e0eaf5a7a7568bc1d39';
		var dhPayload:string = '7589c6bd69d863f193060424cd916bba25510ab8cbed80e608c9a03cb848b712dfc62d0cbea8b7b1bcdd0a9887d5965a11435463789a0009292010f464b57ac817dd35b2bda21444e656313d01ac665c2e0621057dad2400a72317d0a5f2c68c8836418b93ed140844d97940837a6fb14bbe15bace76ebe0385401d2381d35a5d4b0269fa22649f35c6fd9081f2fbfd980e042b1aa314178e0ce51295227d914a3529a8d66200434a3c39aadc7aaa3626ef86e458382f8c0513224c43c81883600c7cb537f4d65282ca94e410e1e5d2de07fe7e3255ca88662aba5720c9057f72fe61e1152e8bf388f0e784aa19b66432c65a457b809d3e085d02435b5e8db5f';
		var feedingNodesBlock:Buffer = FeedingNodesMessageBlock.constructBlock([{ip: '1.1.1.1', port: 80, feedingIdentifier: 'cafebabecafebabecafebabecafebabe'}]);

		var msg = new ReadableShareRequestMessage((new WritableShareRequestMessageFactory()).constructMessage(feedingNodesBlock, hash, new Buffer(dhPayload, 'hex')));

		msg.getDHPayload().toString('hex').should.equal(dhPayload);
		msg.getFileHash().should.equal(hash);
		msg.getFeedingNodesBlock().toString('hex').should.equal(feedingNodesBlock.toString('hex'));
	});

});