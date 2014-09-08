/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableDecryptedMessageInterface = require('./ReadableDecryptedMessageInterface');

/**
 * @interface
 * @class core.protocol.hydra.ReadableDecryptedMessageFactoryInterface
 */
interface ReadableDecryptedMessageFactoryInterface {

	/**
	 * Creates a decrypted message from a give encrypted content and a given key.
	 *
	 * @method core.protocol.hydra.ReadableDecryptedMessageFactoryInterface#create
	 *
	 * @param {Buffer} encryptedContent The payload to decrypt.
	 * @param {Buffer} key The decryption key.
	 */
	create (encryptedContent:Buffer, key:Buffer):ReadableDecryptedMessageInterface;
}

export = ReadableDecryptedMessageFactoryInterface;