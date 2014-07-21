import fs = require('fs');

import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');

/**
 * FileBlockReaderInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.FileBlockReader
 * @implements core.protocol.fileTransfer.share.FileBlockReaderInterface
 *
 * @param {string} filePath Full path of the file to read
 * @param {number} blockSize Number of bytes to read in one block.
 */
class FileBlockReader implements FileBlockReaderInterface {

	/**
	 * Stores the number of bytes in a block.
	 *
	 * @member {number} core.protocol.fileTransfer.share.FileBlockReader~_blockSize
	 */
	private _blockSize:number = 0;

	/**
	 * Indicates whether the file can be read or not.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.FileBlockReader~_canBeRead
	 */
	private _canBeRead:boolean = false;

	/**
	 * Stores the file descriptor to the opened file to read.
	 *
	 * @member {number} core.protocol.fileTransfer.share.FileBlockReader~_fileDescriptor
	 */
	private _fileDescriptor:number = 0;

	/**
	 * Stores the full path to the file to read
	 *
	 * @member {string} core.protocol.fileTransfer.share.FileBlockReader~_filePath
	 */
	private _filePath:string = null;


	public constructor (filePath:string, blockSize:number) {
		this._blockSize = blockSize;
		this._filePath = filePath;
	}


	public abort (callback:(err:Error) => any):void {
		if (this._canBeRead) {
			this._canBeRead = false;

			fs.close(this._fileDescriptor, () => {
				callback(null);
			});
		}
		else {
			process.nextTick(function () {
				callback(new Error('FileBlockReader: Cannot abort closed file block reader'));
			});
		}
	}

	public prepareToRead (callback:(err:Error) => any):void {
		fs.open(this._filePath, 'r', (err:Error, fd:number) => {
			if (err) {
				callback(err);
			}
			else {
				this._canBeRead = true;
				this._fileDescriptor = fd;
				callback(null);
			}
		});
	}

	public readBlock (fromPosition:number, callback:(err:Error, readBytes:Buffer) => any):void {
		if (this._canBeRead) {
			fs.read(this._fileDescriptor, new Buffer(this._blockSize), 0, this._blockSize, fromPosition, (err:Error, numOfReadBytes:number, buffer:Buffer) => {
				if (err) {
					callback(err, null);
				}
				else {
					callback(null, numOfReadBytes < this._blockSize ? buffer.slice(0, numOfReadBytes) : buffer);
				}
			});
		}
		else {
			process.nextTick(function () {
				callback(new Error('FileBlockReader: Cannot read file.'), null);
			});
		}
	}

}

export = FileBlockReader;