/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * This interface takes care of constructing encrypted messages with a given key.
 * Our protocol currently only uses AES-128-GCM, this is how the message is constituted:
 *
 * - 12 bytes for the initialization vector
 * - The encrypted message: Enc_k(Indicator byte if receiver concatenated with payload)
 * - If receiver: 16 Bytes for Authentication tag. (authentication is only used edge-to-edge)
 *
 * @interface
 * @class core.protocol.hydra.WritableEncryptedMessageFactoryInterface
 */
interface WritableEncryptedMessageFactoryInterface {

	/**
	 * Constructs an encrypted message which can be sent to the other side sharing the same key.
	 *
	 * @method core.protocol.hydra.WritableEncryptedMessageFactoryInterface#constructMessage
	 *
	 * @param {Buffer} key The symmetric key to encrypt with
	 * @param {boolean} isReceiver Indicates whether the party the message is sent to is the intended receiver (when using layered encryption)
	 * This information is used for a) the indicator byte preprended to the encrypted payload b) appending an auth-tag (edge-to-edge)
	 * @param {Buffer} payload The actual payload to encrypt
	 * @param {Function} callback Function which gets called with the encrypted message as Buffer or an error if something went wrong.
	 */
	constructMessage (key:Buffer, isReceiver:boolean, payload:Buffer, callback:(err:Error, encryptedMsg:Buffer) => any):void;
}

export = WritableEncryptedMessageFactoryInterface;