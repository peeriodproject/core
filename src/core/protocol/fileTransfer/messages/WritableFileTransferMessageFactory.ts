import WritableFileTransferMessageFactoryInterface = require('./interfaces/WritableFileTransferMessageFactoryInterface');
import TransferMessageByteCheatsheet = require('./TransferMessageByteCheatsheet');

/**
 * WritableFileTransferMessageFactoryInterface implementation
 *
 * @class core.protocol.fileTransfer.WritableFileTransferMessageFactory
 * @implements core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface
 */
class WritableFileTransferMessageFactory implements WritableFileTransferMessageFactoryInterface {

	public constructMessage (transferId:string, messageType:string, payload:Buffer, payloadLength?:number):Buffer {
		payloadLength = payloadLength || payload.length;

		var indicatorByte:number = TransferMessageByteCheatsheet.messageTypes[messageType];

		if (indicatorByte == undefined) {
			throw new Error('WritableFileTransferMessageFactory: Unknown message type.');
		}

		var transferIdBuffer = new Buffer(transferId, 'hex');

		if (transferIdBuffer.length !== 16) {
			throw new Error('WritableFileTransferMessageFactory: Transfer ID bad length.');
		}

		return Buffer.concat([transferIdBuffer, new Buffer([indicatorByte]), payload], payloadLength + 17);
	}
}

export = WritableFileTransferMessageFactory;