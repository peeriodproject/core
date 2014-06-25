/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * This class represents the general payload of a FILE_TRANSFER hydra message.
 * It begins with 16 byte long TransferID, followed by one byte indicating the type of the transfer message. The rest
 * is the message payload of the indicated type.
 *
 * @interface
 * @class core.protocol.fileTransfer.ReadableFileTransferMessageInterface
 */
interface ReadableFileTransferMessageInterface {

	/**
	 * Returns the human readable message type indicated by the byte folllowing the transfer id.
	 *
	 * @method core.protocol.fileTransfer.ReadableFileTransferMessageInterface#getMessageType
	 *
	 * @returns {string}
	 */
	getMessageType ():string;

	/**
	 * Returns the payload of the message of the indicated type.
	 *
	 * @method core.protocol.fileTransfer.ReadableFileTransferMessageInterface#getPayload
	 *
	 * @returns {Buffer}
	 */
	getPayload ():Buffer;

	/**
	 * Returns the transfer id of this FILE_TRANSFER message.
	 *
	 * @method core.protocol.fileTransfer.ReadableFileTransferMessageInterface#getTransferId
	 *
	 * @returns {string}
	 */
	getTransferId ():string;
}

export = ReadableFileTransferMessageInterface;