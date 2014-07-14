/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

import ReadableEncryptedShareMessageInterface = require('./ReadableEncryptedShareMessageInterface');

/**
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface
 */
interface ReadableEncryptedShareMessageFactoryInterface {

	/**
	 * Creates a readable ENCRYPTED_SHARE message from a given decrypted buffer.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableEncryptedShareMessageFactoryInterface#create
	 *
	 * @param {Buffer} buffer The decrypted buffer to create the message from.
	 * @returns {core.protocol.fileTransfer.share.ReadableEncryptedShareMessageInterface} The resulting message or `null` on error.
	 */
	create (buffer:Buffer):ReadableEncryptedShareMessageInterface;
}

export = ReadableEncryptedShareMessageFactoryInterface;