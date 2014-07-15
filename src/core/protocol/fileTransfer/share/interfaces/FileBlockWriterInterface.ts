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

	/**
	 * Opens a file descriptor to the destination path and prepares a writable hash stream. Calls back with an error
	 * if the file descriptor could not be opened.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterInterface#prepareToWrite
	 *
	 * @param {Function} callback Function that gets called when everything has been prepared. Takes an error object as argument.
	 */
	prepareToWrite (callback:(err:Error) => any):void

	/**
	 * The main function: Write a byte block to the destination file, appending the bytes.
	 * Calls back with a function with an optional eror, the full number of bytes that have been written (thus indicating
	 * the position of the first byte of the next expected block) and a flag indicating whether the file is considered finished.
	 * Finished is true, if the full count of written bytes equals the number of expected bytes of the file, plus if then
	 * the calculated SHA-1 hash equals the expected hash.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriterInterface#writeBlock
	 *
	 * @param {Buffer} byteBlock The bytes to write to the file
	 * @param {Function} callback The callback function (see above)
	 */
	writeBlock (byteBlock:Buffer, callback:(err:Error, fullCountOfWrittenBytes?:number, isFinished?:boolean) => any):void;


}

export = FileBlockWriterInterface;