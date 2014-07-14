/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a SHARE_REQUEST message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface
 */
interface WritableShareRequestMessageFactoryInterface {

	/**
	 * Constructs the payload for a SHARE_REQUEST message
	 *
	 * @method core.protocol.fileTransfer.share.WritableShareRequestMessageFactoryInterface#constructMessage
	 *
	 * @param {Buffer} feedingNodesBlock The byte buffer representation of the feeding nodes message block
	 * @param {string} fileHash The SHA-1 hash of the desired file
	 * @param {Buffer} dhPayload The first half of the Diffie-Hellman key exchange
	 * @param {number} feedingNodesBlockLength Optional number of bytes of the feedingNodesBlock
	 * @returns {Buffer} The resulting payload
	 */
	constructMessage (feedingNodesBlock:Buffer, fileHash:string, dhPayload:Buffer, feedingNodesBlockLength?:number):Buffer;
}

export = WritableShareRequestMessageFactoryInterface;