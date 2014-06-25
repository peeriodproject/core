import ReadableFileTransferMessageInterface = require('./interfaces/ReadableFileTransferMessageInterface');
import TransferMessageByteCheatsheet = require('./TransferMessageByteCheatsheet');

/**
 * ReadableFileTransferMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.ReadableFileTransferMessage
 * @implements core.protocol.fileTransfer.ReadableFileTransferMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to construct the message from.
 */
class ReadableFileTransferMessage implements ReadableFileTransferMessageInterface {

	/**
	 * @member {string} core.protocol.fileTransfer.ReadableFileTransferMessage~_messageType
	 */
	private _messageType:string = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.ReadableFileTransferMessage~_payload
	 */
	private _payload:Buffer = null;

	/**
	 * @member {string} core.protocol.fileTransfer.ReadableFileTransferMessage~_transferId
	 */
	private _transferId:string = null;

	public constructor (buffer:Buffer) {
		if (buffer.length < 17) {
			throw new Error('ReadableFileTransferMessage: Message too short!');
		}

		this._transferId = buffer.slice(0, 16).toString('hex');

		var messageTypes:Object = TransferMessageByteCheatsheet.messageTypes;
		var readableTypes:Array<string> = Object.keys(messageTypes);
		var indicatorByte:number = buffer[16];

		for (var i=0, l=readableTypes.length; i<l; i++) {
			var readableType:string = readableTypes[i];
			if (messageTypes[readableType] === indicatorByte) {
				this._messageType = readableType;
			}
		}

		if (!this._messageType) {
			throw new Error('ReadableFileTransferMessage: Could not recognize message type.');
		}

		this._payload = buffer.slice(17);
	}

	public getMessageType ():string {
		return this._messageType;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	public getTransferId ():string {
		return this._transferId;
	}

}

export = ReadableFileTransferMessage;