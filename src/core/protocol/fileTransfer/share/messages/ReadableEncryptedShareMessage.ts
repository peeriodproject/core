import ReadableEncryptedShareMessageInterface = require('./interfaces/ReadableEncryptedShareMessageInterface');
import EncryptedShareMessageByteCheatsheet = require('./EncryptedShareMessageByteCheatsheet');

/**
 * ReadableEncryptedShareMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage
 * @implements core.protocol.fileTransfer.share.ReadableEcnryptedShareMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to construct the message from.
 */
class ReadableEncryptedShareMessage implements ReadableEncryptedShareMessageInterface {

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage~_messageType
	 */
	private _messageType:string = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableEcnryptedShareMessage~_payload
	 */
	private _payload:Buffer = null;

	public constructor (buffer:Buffer) {
		var indicatorByte:number = buffer[0];

		var messageTypes:any = EncryptedShareMessageByteCheatsheet.messageTypes;
		var keys:Array<string> = Object.keys(messageTypes);

		for (var i = 0, l = keys.length; i < l; i++) {
			if (messageTypes[keys[i]] === indicatorByte) {
				this._messageType = keys[i];
			}
		}

		if (!this._messageType) {
			throw new Error('ReadableEncryptedShareMessage: Unknown message type');
		}

		this._payload = buffer.slice(1);
	}

	public getMessageType ():string {
		return this._messageType;
	}

	public getPayload ():Buffer {
		return this._payload;
	}
}

export = ReadableEncryptedShareMessage;