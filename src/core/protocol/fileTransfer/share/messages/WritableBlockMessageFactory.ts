import WritableBlockMessageFactoryInterface = require('./interfaces/WritableBlockMessageFactoryInterface');

/**
 * WritableBlockMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.WritableBlockMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface
 */
class WritableBlockMessageFactory implements WritableBlockMessageFactoryInterface {

	public constructMessage (feedingNodesBlock:Buffer, firstBytePositionOfBlock:number, nextTransferIdentifier:string, dataBlock:Buffer, feedingNodesBlockLen?:number, dataBlockLen?:number):Buffer {
		var fullByteLength:number = (feedingNodesBlockLen || feedingNodesBlock.length) + (dataBlockLen || dataBlock.length) + 24;
		var firstPositionBuffer:Buffer = new Buffer(8);

		firstPositionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfBlock / 1000), 0);
		firstPositionBuffer.writeUInt32BE(firstBytePositionOfBlock % 1000, 4);

		if (nextTransferIdentifier.length !== 32) {
			throw new Error('WritableBlockMessageFactory: Bad next transfer identifier length. Expected 16 bytes.');
		}

		return Buffer.concat([feedingNodesBlock, firstPositionBuffer, new Buffer(nextTransferIdentifier, 'hex'), dataBlock], fullByteLength);
	}

}

export = WritableBlockMessageFactory;