/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a SHARE_RATIFY message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface
 */
interface WritableShareRatifyMessageFactoryInterface {

	/**
	 * Returns the plaintext part of the SHARE_RATIFY message which has to be encrypted. Pass in to `constructMessage`
	 * to get the full working buffer. See {@link core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface} for
	 * more information.
	 *
	 * @method core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface#constructPartToEncrypt
	 *
	 * @param {Buffer} feedingNodesBlock The feeding nodes block.
	 * @param {number} filesize The size of the file about to be shared.
	 * @param {string} filename The name of the file about to be shared.
	 * @param {number} feedingNodesBlockLen Optional number of bytes of the feeding nodes block.
	 * @returns {Buffer}
	 */
	constructPartToEncrypt (feedingNodesBlock:Buffer, filesize:number, filename:string, feedingNodesBlockLen?:number):Buffer;

	/**
	 * Constructs the payload for a SHARE_RATIFY message.
	 *
	 * @method core.protocol.fileTransfer.share.WritableShareRatifyMessageFactoryInterface#constructMessage
	 *
	 * @param {Buffer} dhPayload The other half of the Diffie-Hellman key exchange
	 * @param {Buffer} secretHash The SHA-1 hash of the shared secret.
	 * @param {Buffer} encryptedPart The encrypted part received from `constructPartToEncrypt`
	 * @param {number} encryptedPartLen Optional number of bytes of the encrypted part.
	 * @returns {Buffer}
	 */
	constructMessage (dhPayload:Buffer, secretHash:Buffer, encryptedPart:Buffer, encryptedPartLen?:number):Buffer;
}

export = WritableShareRatifyMessageFactoryInterface;