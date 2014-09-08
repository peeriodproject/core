/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for an ENCRYPTED_SHARE message.
 * Please note that this returns the plaintext payload which can the be encrypted and be sent via an ENCRYPTED_SHARE transfer message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableEncryptedShareInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableEncryptedShareMessageFactoryInterface
 */
interface WritableEncryptedShareMessageFactoryInterface {

	/**
	 * Constructs the payload for an ENCRYPTED_SHARE message, which can the be encrypted.
	 *
	 * @param {string} messageType The type of the sub-message
	 * @param {Buffer} payload The payload of the sub-message
	 * @param {number} payloadLen Optional number of bytes of the sub-message
	 */
	constructMessage (messageType:string, payload:Buffer, payloadLen?:number):Buffer;
}

export = WritableEncryptedShareMessageFactoryInterface;