import WritableShareRequestMessageFactoryInterface = require('./interfaces/WritableShareRequestMessageFactoryInterface');

/**
 * WritableShareRequestMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.WritableShareRequestMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface
 */
class WritableShareRequestMessageFactory implements WritableShareRequestMessageFactoryInterface {

	public constructMessage (feedingNodesBlock:Buffer, fileHash:string, dhPayload:Buffer, feedingNodesBlockLength?:number):Buffer {
		var fullLength = 276 + (feedingNodesBlockLength || feedingNodesBlock.length);

		return Buffer.concat([feedingNodesBlock, new Buffer(fileHash, 'hex'), dhPayload], fullLength);
	}

}

export = WritableShareRequestMessageFactory;