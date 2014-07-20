/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The FileBlockReader forms the opposite side of a file block writer - given a path, the reader reads byte blocks of
 * a provided size from the file.
 *
 * NOTE: The FileBlockReader does not abort itself, thus in order to close the file descriptor, `abort` MUST be called.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.FileBlockReaderInterface
 */
interface FileBlockReaderInterface {

	/**
	 * Aborts the block reader by closing the file descriptor. Can only be called once after
	 * a successful `prepareToRead` call.
	 *
	 * NOTE: As opposed to the block writer, a block reader instance does not abort itself!
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockReaderInterface#abort
	 *
	 * @param {Function} callback Method which gets called after the file descriptor has been closed, with an optional error as argument.
	 */
	abort (callback:(err:Error) => {}):void;

	/**
	 * Opens the file.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockReaderInterface#prepareToRead
	 *
	 * @param {Function} callback Method which gets called after the file has been opened, with an error as argument if the file could
	 * not be opened.
	 */
	prepareToRead (callback:(err:Error) => any):void;

	/**
	 * Reads a byte block of a given size from the file.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockReaderInterface#readBlock
	 *
	 * @param {number} fromPosition Position of first byte of the block to read.
	 * @param {Function} callback Method which gets called after the block has been read, with an optional error as argument and the buffer
	 * of read bytes. The size of the buffer can vary, as a file read from a given position to its final byte does not need to be the
	 * exact given block size.
	 */
	readBlock (fromPosition:number, callback:(err:Error, readBytes:Buffer) => any):void;
}

export = FileBlockReaderInterface;