/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Representation of a BLOCK message, which carries a data block of a shared file.
 * It consists of:
 *
 * - The feeding node block
 * - 8 bytes for the position of the first byte of the block in the shared file.
 * - 16 bytes for the next transfer identifier expected
 * - the rest is the data block
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableBlockMessageInterface
 */
interface ReadableBlockMessageInterface {

	/**
	 * Returns the data block of the shared file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockMessageInterface#getDataBlock
	 *
	 * @returns {Buffer}
	 */
	getDataBlock ():Buffer;

	/**
	 * Returns the feeding nodes block extracted from the message.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockMessageInterface#getFeedingNodesBlock
	 *
	 * @returns {Buffer}
	 */
	getFeedingNodesBlock ():Buffer;

	/**
	 * Returns the position of the first byte of the block transferred in the shared file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockMessageInterface#getFirstBytePositionOfBlock
	 *
	 * @returns {number}
	 */
	getFirstBytePositionOfBlock ():number;

	/**
	 * Returns the next transfer identifier expected.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableBlockMessageInterface#getNextTransferIdentifier
	 *
	 * @returns {string}
	 */
	getNextTransferIdentifier ():string;
}

export = ReadableBlockMessageInterface;