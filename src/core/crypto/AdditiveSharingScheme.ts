/// <reference path='../../../ts-definitions/node/node.d.ts' />

import crypto = require('crypto');

/**
 * This static class helps generating (and decrypting) random shares for an additive sharing scheme.
 *
 * @class core.crypto.AdditiveSharingScheme
 */
class AdditiveSharingScheme {

	/**
	 * Calculates the cleartext from an of given shares.
	 *
	 * @method core.crypto.AdditiveSharingScheme.getCleartext
	 *
	 * @param {Array<Buffer>} shares The input array of shares
	 * @param {number} length (optional) Length of the expected output buffer
	 * @returns {Buffer} The calculated cleartext
	 */
	public static getCleartext (shares:Array<Buffer>, length?:number):Buffer {
		length = length ? length : shares[0].length;

		var retBuf:Buffer = new Buffer(length);
		var amount:number = shares.length;

		for (var i = 0; i < length; i++) {
			var mem:number = 0x00;

			for (var j = 0; j < amount; j++) {
				mem += shares[j][i];
			}

			retBuf[i] = mem;
		}

		return retBuf;
	}

	/**
	 * Gets a number of random buffers.
	 *
	 * @method core.crypto.AdditiveSharingScheme.getRandomBuffers
	 *
	 * @param {number} amount Number of expected random buffers.
	 * @param {number} length The length of each buffer (number of octets)
	 * @param {Function} callback Callback which gets called with the array as parameter as soon as all random Buffers have been generated.
	 */
	public static getRandomBuffers (amount:number, length:number, callback:(randBuffers:Array<Buffer>) => any):void {

		var i:number = 0;
		var ret:Array<Buffer> = [];
		var getRandomBuffer = function () {
			if (++i <= amount) {
				crypto.randomBytes(length, function (err, buf) {
					if (err) {
						i--;
						setImmediate(function () {
							getRandomBuffer();
						});
					}
					else {
						ret.push(buf);
						getRandomBuffer();
					}
				});
			}
			else {
				callback(ret);
			}
		}

		getRandomBuffer();
	}

	/**
	 * Calculates all shares for an additive sharing scheme by a given input buffer.
	 *
	 * @method core.crypto.AdditiveSharingScheme.getShares
	 *
	 * @param {Buffer} input The input buffer (the cleartext, so to say)
	 * @param (number} numOfShares Number of expected shares
	 * @param {number} length The length of the cleartext / shares
	 * @param {Function} callback Function which gets called with the resulting array of shares as parameter.
	 */
	public static getShares (input:Buffer, numOfShares:number, length:number, callback:(shares:Array<Buffer>) => any):void {

		AdditiveSharingScheme.getRandomBuffers(numOfShares - 1, length, function (sh:Array<Buffer>) {
			var lastShare:Buffer = new Buffer(length);

			for (var i = 0; i < length; i++) {
				var mem:number = 0x00;

				for (var j = 0; j < numOfShares - 1; j++) {
					mem += sh[j][i];
				}
				lastShare[i] = input[i] - mem;
			}

			sh.push(lastShare);
			callback(sh);
		});

	}

}

export = AdditiveSharingScheme;