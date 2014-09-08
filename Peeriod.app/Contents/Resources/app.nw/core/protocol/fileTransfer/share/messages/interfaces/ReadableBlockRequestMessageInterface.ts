/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * BLOCK_REQUEST message indicate the receiver what part of the shared file to send.
 * It consists of:
 * - The feeding nodes block
 * - 8 bytes for the first byte of the block to send
 * - 16 bytes for the expected transfer identifier for this block
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface
 */
interface ReadableBlockRequestMessageInterface {

	/**
	 * Returns the feeding nodes block extracted from the message.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface#getFeedingNodesBlock
	 *
	 * @returns {Buffer}
	 */
	getFeedingNodesBlock ():Buffer;

	/**
	 * Returns the position of the first byte of the next block to send.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface#getFirstBytePositionOfBlock
	 *
	 * @returns {number}
	 */
	getFirstBytePositionOfBlock ():number;

	/**
	 * Returns the transfer identifier of the expected block. When sending the block, the other side must use this
	 * transfer identifier.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface#getNextTransferIdentifier
	 *
	 * @returns {string} hexadecimal string representation of the next transfer id.
	 */
	getNextTransferIdentifier ():string;
}

export = ReadableBlockRequestMessageInterface;