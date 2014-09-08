import WritableEncryptedShareMessageFactoryInterface = require('./interfaces/WritableEncryptedShareMessageFactoryInterface');
import EncryptedShareMessageByteCheatsheet = require('./EncryptedShareMessageByteCheatsheet');

/**
 * WritableEncryptedShareMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactory
 * @implements core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface
 */
class WritableEncryptedShareMessageFactory implements WritableEncryptedShareMessageFactoryInterface {

	public constructMessage (messageType:string, payload:Buffer, payloadLen?:number):Buffer {
		var indicatorByte:number = EncryptedShareMessageByteCheatsheet.messageTypes[messageType];
		var fullLength:number = 1 + (payloadLen || payload.length);

		if (indicatorByte === undefined) {
			throw new Error('WritableEncryptedShareMessageFactory: Unknown message type!');
		}

		return Buffer.concat([new Buffer([indicatorByte]), payload], fullLength);
	}

}

export = WritableEncryptedShareMessageFactory;