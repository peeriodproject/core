/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Representation of a subtype of ENCRYPTED_SHARE messages. This title may be misleading - the payload of an ENCRYPTED_SHARE message
 * must be decrypted before it can be turned into a readable message with a sub-message type.
 * E.g. subtypes are BLOCK_REQUEST, SHARE_ABORT, BLOCK.
 *
 * Assuming a decrypted payload from a received ENCRYPTED_SHARE message is passed in, the sub message type consists of:
 * - 1 byte indicating the message byte
 * - The rest is the payload.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableEncryptedShareMessageInterface
 */
interface ReadableEncryptedShareMessageInterface {

	/**
	 * Returns the type of the sub-message, according to the message byte cheatsheet
	 *
	 * @method core.protocol.fileTransfer.share.ReadableEncryptedShareMessageInterface#getMessageType
	 *
	 * @returns {string} The message type if known, else throws an error
	 */
	getMessageType ():string;

	/**
	 * Returns the payload of the sub-message
	 *
	 * @method core.protocol.fileTransfer.share.ReadableEncryptedShareMessageInterface#getPayload
	 *
	 * @returns {Buffer} The payload of the sub-message
	 */
	getPayload ():Buffer;
}

export = ReadableEncryptedShareMessageInterface;