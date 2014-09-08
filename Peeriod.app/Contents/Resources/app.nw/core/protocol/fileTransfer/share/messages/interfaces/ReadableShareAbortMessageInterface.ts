/// <reference path='../../../../../../../ts-definitions/node/node.d.ts' />

/**
 * SHARE_ABORT messages are a sub-message type of ENCRYPTED_SHARE messages.
 * It consists of a concatenation of 8 bytes for the file size, 20 bytes for the SHA-1 hash of the shared file and
 * the rest is a UTF-8 encoded string representation of the filename.
 *
 * SHARE_ABORT messages indicate manually aborting a file sharing process and can be issued from both uploader and downloader side.
 * SHARE_ABORT messages are only accepted if there are shared secret keys (obviosuly, as it is encrypted ;) )
 *
 * @interface
 * @class core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface
 */
interface ReadableShareAbortMessageInterface {

	/**
	 * Returns the hexadecimal string representation of the SHA-1 hash of the shared file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface#getFileHash
	 *
	 * @returns {string}
	 */
	getFileHash ():string;

	/**
	 * Returns the UTF-8 encoded string representation of the name of the shared file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface#getFilename
	 *
	 * @returns {string}
	 */
	getFilename ():string;

	/**
	 * Returns the number of bytes of the shared file.
	 *
	 * @method core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface#getFilesize
	 *
	 * @returns {number}
	 */
	getFilesize ():number;

}

export = ReadableShareAbortMessageInterface;