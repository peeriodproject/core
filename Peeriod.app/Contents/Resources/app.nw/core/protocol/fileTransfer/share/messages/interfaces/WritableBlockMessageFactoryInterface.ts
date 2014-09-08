/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a BLOCK message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableBlockMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface
 */
interface WritableBlockMessageFactoryInterface {

	/**
	 * Constructs the payload for a BLOCK message.
	 *
	 * @method core.protocol.fileTransfer.share.WritableBlockMessageFactoryInterface#constructMessage
	 *
	 * @param {Buffer} feedingNodesBlock The feeding nodes block
	 * @param {number} firstBytePositionOfBlock The position of the first byte of the sent block within the shared file.
	 * @param {string} nextTransferIdentifier The next expected transfer identifier in its hexadecimal string representation.
	 * @param {Buffer} dataBlock The sent data block of the shared file.
	 * @param {number} feedingNodesBlockLen Optional number of bytes of the feeding nodes byte block.
	 * @param {number} dataBlockLen Optional number of bytes of the data block.
	 * @returns {Buffer} The resulting payload.
	 */
	constructMessage (feedingNodesBlock:Buffer, firstBytePositionOfBlock:number, nextTransferIdentifier:string, dataBlock:Buffer, feedingNodesBlockLen?:number, dataBlockLen?:number):Buffer;
}

export = WritableBlockMessageFactoryInterface;