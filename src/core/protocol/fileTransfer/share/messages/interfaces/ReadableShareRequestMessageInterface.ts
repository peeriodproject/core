/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Representation of a SHARE_REQUEST message, which is a download request for a specific file to a specific node (via the circuits).
 * The file is identified by the SHA-1 hash. SHARE_REQUEST messages are unencrypted in its recipient-form.
 *
 * Transfer identifier is a temporary random 16-byte sequence, used only for correctly assigning an incoming SHARE_RATIFY message.
 *
 * SHARE_REQUEST messages consist of the following:
 * - The FeedingNode-Block
 * - 20 bytes for the SHA-1 hash of the desired file
 * - 256 bytes for the first half of the Diffie-Hellman key exchange
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface
 */
interface ReadableShareRequestMessageInterface {

	/**
	 * Returns the first half of the Diffie-Hellman key exchange.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface#getDHPayload
	 *
	 * @returns {NodeJS.Buffer}
	 */
	getDHPayload ():Buffer;

	/**
	 * Returns the feeding nodes block as its byte buffer representation
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface#getDHPayload
	 *
	 * @returns {NodeJS.Buffer}
	 */
	getFeedingNodesBlock ():Buffer;

	/**
	 * Returns the SHA-1 hash identifying the desired file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface#getDHPayload
	 *
	 * @returns {string}
	 */
	getFileHash ():string;
}

export = ReadableShareRequestMessageInterface;