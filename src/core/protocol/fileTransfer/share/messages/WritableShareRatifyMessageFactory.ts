import WritableShareRatifyMessageFactoryInterface = require('./interfaces/WritableShareRatifyMessageFactoryInterface');

/**
 * WritableShareRatifyMessageFactoryInterface implementation
 *
 * @class core.protocol.fileTransfer.share.WritableShareRatifyMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface
 */
class WritableShareRatifyMessageFactory implements WritableShareRatifyMessageFactoryInterface {

	public constructPartToEncrypt (feedingNodesBlock:Buffer, filesize:number, filename:string, feedingNodesBlockLen?:number):Buffer {
		var fullLen:number = feedingNodesBlockLen || feedingNodesBlock.length;
		var filenameBuffer:Buffer = new Buffer(filename, 'utf8');
		var filesizeBuffer:Buffer = new Buffer(8);

		filesizeBuffer.writeUInt32BE(Math.floor(filesize / 1000), 0);
		filesizeBuffer.writeUInt32BE(filesize % 1000, 4);

		fullLen += 8 + filenameBuffer.length;

		return Buffer.concat([feedingNodesBlock, filesizeBuffer, filenameBuffer], fullLen)
	}

	public constructMessage (dhPayload:Buffer, secretHash:Buffer, encryptedPart:Buffer, encryptedPartLen?:number):Buffer {
		var fullLen:number = 276 + (encryptedPartLen || encryptedPart.length);

		return Buffer.concat([dhPayload, secretHash, encryptedPart], fullLen);
	}
}

export = WritableShareRatifyMessageFactory;