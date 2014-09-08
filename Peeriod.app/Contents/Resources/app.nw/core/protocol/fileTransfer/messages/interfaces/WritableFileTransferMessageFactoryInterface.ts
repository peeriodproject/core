/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a FILE_TRANSFER message
 * For more information on the message format, see {@link core.protocol.fileTransfer.ReadableFileTransferMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface
 */
interface WritableFileTransferMessageFactoryInterface {

	/**
	 * Constructs the payload for a FILE_TRANSFER message.
	 *
	 * @method core.protocol.fileTransfer.WritableFileTransferMessageFactoryInterface#constructMessage
	 *
	 * @param {string} transferId The Transfer ID
	 * @param {messageType} messageType The human readable representation of the transfer message type
	 * @param {Buffer} payload The payload of the transfer message.
	 * @param {number} payloadLength Optional. Number of octets of the payload.
	 * @returns {Buffer} The resulting payload of a FILE_TRANSFER message
	 */
	constructMessage (transferId:string, messageType:string, payload:Buffer, payloadLength?:number):Buffer;

}

export = WritableFileTransferMessageFactoryInterface;