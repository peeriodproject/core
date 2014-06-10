import crypto = require('crypto');

import WritableEncryptedMessageFactoryInterface = require('./interfaces/WritableEncryptedMessageFactoryInterface');
import HydraByteCheatsheet = require('./HydraByteCheatsheet');

/**
 * AES 128 Galois Counter Mode implementation of WritableEncryptedMessageFactoryInterface
 *
 * @class core.protocol.hydra.Aes128GcmWritableMessageFactory
 * @implements core.protocol.hydra.WritableEncryptedMessageFactoryInterface
 */
class Aes128GcmWritableMessageFactory implements WritableEncryptedMessageFactoryInterface {

	public constructMessage (key:Buffer, isReceiver:boolean, payload:Buffer, callback:(err:Error, encryptedMsg:Buffer) => any):void {

		this._getIV((iv:Buffer) => {

			var outputBuffer:Buffer = null;
			var err:Error = null;

			try {
				var outputArray:Array<Buffer> = [iv];
				var cipher:crypto.Cipher = crypto.createCipheriv('aes-128-gcm', key, iv);

				outputArray.push(cipher.update(new Buffer([HydraByteCheatsheet.encryptedMessages[isReceiver ? 'isReceiver' : 'notReceiver']])));
				outputArray.push(cipher.update(payload));

				cipher.final();

				if (isReceiver) {
					outputArray.push(this._getAuthTagByCipher(cipher));
				}

				outputBuffer = Buffer.concat(outputArray, 13 + payload.length + (isReceiver ? 16 : 0));
			}
			catch (e) {
				err = e;
			}

			callback(err, outputBuffer);

		});
	}

	/**
	 * Returns the authentication tag of finalized cipher.
	 *
	 * !!!ATTENTION!!!!
	 * This is work in production! node.js's crypto module supports `getAuthTag` only since v.0.11.10,
	 * so true authentication will land when node.js v.0.12 is stable and node-webkit has caught up!
	 *
	 * @method core.protocol.hydra.Aes128GcmWritableMessageFactory~_getAuthTagByCipher
	 *
	 * @param {crypto.Cipher} cipher The finalized cipher object
	 * @returns {Buffer} The authentication tag as Buffer.
	 */
	private _getAuthTagByCipher (cipher:crypto.Cipher) {
		var ret:Buffer = new Buffer(16);

		ret.fill(0xff);

		return ret;
	}

	/**
	 * Gets a cryptographically secure random initialization vector for GCM of length 12.
	 * If the entropy source is drained, it retries until it succeeds.
	 *
	 * @method core.protocol.hydra.Aes128GcmWritableMessageFactory~_getIV
	 *
	 * @param {Function} callback Function which gets called with the resulting initialization vector as Buffer.
	 */
	private _getIV (callback:(iv:Buffer) => any):void {
		crypto.randomBytes(12, (err:Error, output:Buffer) => {
			if (err) {
				setImmediate(() => {
					this._getIV(callback);
				});
			}
			else {
				callback(output);
			}
		});
	}
}

export = Aes128GcmWritableMessageFactory;