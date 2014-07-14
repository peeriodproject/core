/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * Constructs the payload for a SHARE_ABORT message.
 * For more information on the message format, see {@link core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface
 */
interface WritableShareAbortMessageFactoryInterface {

	/**
	 * Constructs the payload for a SHARE_ABORT message.
	 *
	 * @param {number} filesize The number of bytes of the shared file
	 * @param {string} filename The name of the shared file, UTF-8 encoded
	 * @param {string} filehash The hexadecimal string representation of the SHA-1 hash of the shared file
	 * @returns {Buffer} The resulting payload
	 */
	constructMessage (filesize:number, filename:string, filehash:string):Buffer;
}

export = WritableShareAbortMessageFactoryInterface;