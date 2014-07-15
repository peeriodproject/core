/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The file block writer forms an abstraction of continuously writing bytes to an open file descriptor.
 * On construction, a filename, a destination folder, the expected size of the file and the expected SHA-1 hash are provided.
 * It opens the file to which byte buffers can be written to, until the expected size has been reached (or an error occurs).
 * If an error occurs, everything is cleaned up and the file is deleted.
 * When the expected size has been reached, the file is being finalized by checking the SHA-1 hash against the provided hash.
 * Unmatching hashes render an error (and thus lead to the deletion of the file), matching hashes complete the process.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.FileBlockWriterInterface
 */
interface FileBlockWriterInterface {

	/**
	 * Manually aborts the file writing process.
	 * Deletes the destination file and cleans up the file descriptor, as well as ends the SHA-1 Read-Write-Stream (if there is one)
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterInterface#abort
	 *
	 * @param {Function} callback Function that gets called (without arguments) when the file descriptor has been closed,
	 * the file was deleted and the hashstream has been ended.
	 */
	abort (callback:Function):void;

	/**
	 * Deletes the file being written to, if there is one and it hasn't been deleted yet. If `deleteFile` has already been called,
	 * nothing is done and the callback is called with `null` as error argument.
	 * Otherwise node.js filesystem errors can be passed into the callback (e.g. file is not present)
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterInterface#deleteFile
	 *
	 * @param {Function} callback Function that gets called when everything has been done.
	 */
	deleteFile (callback:(err:Error) => any):void;

	/**
	 * Returns the full path of the destination file being written.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterInterface#getFilePath
	 *
	 * @returns {string} The full path.
	 */
	getFilePath ():string;

	prepareToWrite (callback:(err:Error) => any):void

	writeBlock (byteBlock:Buffer, callback:(err:Error, fullCountOfWrittenBytes?:number, isFinished?:boolean) => any):void;


}

export = FileBlockWriterInterface;