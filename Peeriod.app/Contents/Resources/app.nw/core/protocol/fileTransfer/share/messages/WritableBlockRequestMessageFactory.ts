import WritableBlockRequestMessageFactoryInterface = require('./interfaces/WritableBlockRequestMessageFactoryInterface');

/**
 * WritableBlockRequestMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.WritableBlockRequestMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface
 */
class WritableBlockRequestMessageFactory implements WritableBlockRequestMessageFactoryInterface {

	public constructMessage (feedingNodesBlock:Buffer, firstBytePositionOfNextBlock:number, nextTransferIdentifier:string, feedingNodesBlockLen?:number):Buffer {

		if (nextTransferIdentifier.length !== 32) {
			throw new Error('WritableBlockRequestMessageFactory: Transfer identifier bad length. Expected 16 bytes in hexadecimal string representation.');
		}

		var fullLen:number = (feedingNodesBlockLen || feedingNodesBlock.length) + 24;

		var positionBuffer:Buffer = new Buffer(8);

		positionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfNextBlock / 1000), 0);
		positionBuffer.writeUInt32BE(Math.floor(firstBytePositionOfNextBlock % 1000), 4);

		return Buffer.concat([feedingNodesBlock, positionBuffer, new Buffer(nextTransferIdentifier, 'hex')], fullLen);
	}

}

export = WritableBlockRequestMessageFactory;