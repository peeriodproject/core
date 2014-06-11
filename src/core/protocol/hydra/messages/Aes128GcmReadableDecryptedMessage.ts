import crypto = require('crypto');

import ReadableDecryptedMessageInterface = require('./interfaces/ReadableDecryptedMessageInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * If this is true, all message integrity checks automatically succeed.
 * This is due to the node versioning conflict. Authentication tags in node.js's crypto module are supported since
 * v.0.11.10 only.
 * As soon as v.0.12 lands and node-webkit has caught up, this will be fixed!!
 *
 * @type {boolean}
 */
var SKIP_AUTH = true;

/**
 * Decrypts an encrypted payload with AES-128-GCM. Also does integrity checks if needed.
 *
 * @class core.protocol.hydra.Aes128GcmReadableDecryptedMessage
 * @implements core.protocol.hydra.ReadableDecryptedMessageInterface
 *
 * @param {Buffer} encryptedContent The encrypted message which needs to be decrypted.
 * @param {Buffer} key The symmetric key for decryption.
 */
class Aes128GcmReadableDecryptedMessage implements ReadableDecryptedMessageInterface {

	/**
	 * Flag for the first decrypted byte, which is the indicator byte if this decrypted
	 * message is the "receiver message", i.e. if the decrypted content is plaintext now or needs to be
	 * decrypted again.
	 *
	 * @member {boolean} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_isReceiver
	 */
	private _isReceiver:boolean = false;

	/**
	 * Stores the decrypted payload of the message
	 *
	 * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_payload
	 */
	private _payload:Buffer = null;

	/**
	 * The extracted initialization vector of the message.
	 *
	 * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_iv
	 */
	private _iv:Buffer = null;

	/**
	 * The symmetric key of the message
	 *
	 * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_key
	 */
	private _key:Buffer = null;

	/**
	 * The encrypted content which gets stripped off IV, authTag and body step-by-step.
	 *
	 * @member {Buffer} core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_encryptedContentFull
	 */
	private _encryptedContentFull:Buffer = null;

	constructor (encryptedContent:Buffer, key:Buffer) {

		this._key = key;

		this._iv = encryptedContent.slice(0, 12);

		this._encryptedContentFull = encryptedContent.slice(12);

		var decipher:crypto.Decipher = crypto.createDecipheriv('aes-128-gcm', this._key, this._iv);

		if (this._extractIsReceiver()) {
			var contentLength:number = this._encryptedContentFull.length;

			// this is not working yet. wait for node v.0.12
			//decipher.setAuthTag(encryptedContent.slice(contentLength - 16));
			this._encryptedContentFull = this._encryptedContentFull.slice(0, contentLength - 16);
		}

		this._payload = decipher.update(this._encryptedContentFull);

		try {
			decipher.final();
		}
		catch (e) {
			if (this._isReceiver && !SKIP_AUTH) {
				this._payload = null;
				throw new Error('Aes128GcmReadableDecryptedMessage: Integrity check fail!');
			}
			// else no authentication needed. simply proceed.
		}

	}

	public isReceiver ():boolean {
		return this._isReceiver;
	}

	public getPayload ():Buffer {
		return this._payload;
	}

	/**
	 * Decrypts the first byte and decides (with the help of the byte cheatsheet) if this message
	 * is the "receiver" message.
	 *
	 * @method core.protocol.hydra.Aes128GcmReadableDecryptedMessage~_extractIsReceiver
	 *
	 * @returns {boolean} The result of the check.
	 */
	private _extractIsReceiver ():boolean {

		var decipher:crypto.Decipher = crypto.createDecipheriv('aes-128-gcm', this._key, this._iv);

		// we check the first byte
		var firstByte:number = decipher.update(this._encryptedContentFull.slice(0, 1))[0];

		try {
			// this will fail
			decipher.final();
		}
		catch (e) {
		}

		if (firstByte === HydraByteCheatsheet.encryptedMessages.isReceiver) {
			this._isReceiver = true;
		}
		else if (firstByte !== HydraByteCheatsheet.encryptedMessages.notReceiver) {
			throw new Error('Aes128GcmReadableDecryptedMessage: Unknown indicator byte');
		}

		this._encryptedContentFull = this._encryptedContentFull.slice(1);

		return this._isReceiver;
	}

}

export = Aes128GcmReadableDecryptedMessage;