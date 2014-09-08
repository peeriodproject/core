/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a BLOCK_REQUEST message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface
 */
interface WritableBlockRequestMessageFactoryInterface {

	/**
	 * Constructs the payload for a BLOCK_REQUEST message.
	 *
	 * @method core.protocol.fileTransfer.share.WritableBlockRequestMessageFactoryInterface#constructMessage
	 *
	 * @param {Buffer} feedingNodesBlock The feeding nodes block
	 * @param {number} firstBytePositionOfNextBlock The position of the first byte of the next expected block.
	 * @param {string} nextTransferIdentifier The next transfer identifier in its hexadecimal string representation.
	 * @param {number} feedingNodesBlockLen Optional number of bytes of the feeding nodes byte block.
	 * @returns {Buffer} The resulting payload.
	 */
	constructMessage (feedingNodesBlock:Buffer, firstBytePositionOfNextBlock:number, nextTransferIdentifier:string, feedingNodesBlockLen?:number):Buffer;
}

export = WritableBlockRequestMessageFactoryInterface;