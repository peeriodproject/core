/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Representation of a decrypted received message.
 *
 * @interface
 * @class core.protocol.hydra.ReadableDecryptedMessageInterface
 */
interface ReadableDecryptedMessageInterface {

	/**
	 * Returns the result of the first decrypted byte, which is the indicator byte if this decrypted
	 * message is the "receiver message", i.e. if the decrypted content is plaintext now or needs to be decrypted again.
	 *
	 * @method core.protocol.hydra.ReadableDecryptedMessageInterface#isReceiver
	 *
	 * @returns {boolean}
	 */
	isReceiver ():boolean;

	/**
	 * Returns the decrypted payload of the message.
	 *
	 * @method core.protocol.hydra.ReadableDecryptedMessageInterface#isReceiver
	 *
	 * @returns {Buffer}
	 */
	getPayload ():Buffer;
}

export = ReadableDecryptedMessageInterface;