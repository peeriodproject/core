/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Representation of a SHARE_RATIFY message. This is a bit more complicated than a 'usual' message as it consists of an
 * unencrypted and an encrypted part.
 * The encrypted part must be decrypted and then passed into the message again, so the other parts can be deformatted.
 *
 * A SHARE_RATIFY message consists of the following parts:
 *
 * - (unencrypted) 256 bytes for the other half of the Diffie-Hellman key exchange
 * - (unencrypted) 20 bytes for the SHA-1 hash of the shared secret
 * - (encrypted) the FeedingNodesBlock
 * - (encrypted) 8 bytes for the size of the file to send
 * - (encrypted) The rest as a UTF-8 representation of the name of the file to send
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface
 */
interface ReadableShareRatifyMessageInterface {

	/**
	 * Deformats the remaining attributes (feeding nodes block, filesize, filename) from the provided decrypted buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#deformatDecryptedPart
	 */
	deformatDecryptedPart (decryptedBuffer:Buffer):void;

	/**
	 * Returns the feeding nodes block extracted from the decrypted part.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getDeformattedDecryptedFeedingNodesBlock
	 *
	 * @returns {Buffer}
	 */
	getDeformattedDecryptedFeedingNodesBlock ():Buffer;

	/**
	 * Returns the filename extracted from the decrypted part.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getDeformattedDecryptedFilename
	 *
	 * @returns {string}
	 */
	getDeformattedDecryptedFilename ():string;

	/**
	 * Returns the filesize (number of bytes) extracted from the decrypted part.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getDeformattedDecryptedFileSize
	 *
	 * @returns {number}
	 */
	getDeformattedDecryptedFileSize ():number;

	/**
	 * Returns the other half of the Diffie-Hellman key exchange.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getDHPayload
	 *
	 * @returns {Buffer}
	 */
	getDHPayload ():Buffer;

	/**
	 * Returns the encrypted part of the message, which can be decrypted and then deformatted by the message again with
	 * `deformatDecryptedPart`.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getEncryptedPart
	 *
	 * @returns {Buffer}
	 */
	getEncryptedPart ():Buffer;

	/**
	 * Returns the SHA-1 hash of the shared secret calculated with the Diffie-Hellman exchange object.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface#getSecretHash
	 *
	 * @returns {Buffer}
	 */
	getSecretHash ():Buffer;

}

export = ReadableShareRatifyMessageInterface;