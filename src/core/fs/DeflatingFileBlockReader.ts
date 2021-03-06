import fs = require('fs');
import zlib = require('zlib');

import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');

/**
 * FileBlockReaderInterface implementation using zlib's deflate for compressing the read bytes.
 *
 * @class core.fs.DeflatingFileBlockReader
 * @implements core.fs.FileBlockReaderInterface
 *
 * @param {string} filePath Full path of the file to read
 * @param {number} blockSize Number of bytes to read in one block.
 */
class DeflatingFileBlockReader implements FileBlockReaderInterface {

	/**
	 * Stores the number of bytes in a block.
	 *
	 * @member {number} core.fs.FileBlockReader~_blockSize
	 */
	private _blockSize:number = 0;

	/**
	 * Indicates whether the file can be read or not.
	 *
	 * @member {boolean} core.fs.FileBlockReader~_canBeRead
	 */
	private _canBeRead:boolean = false;

	/**
	 * Stores the file descriptor to the opened file to read.
	 *
	 * @member {number} core.fs.FileBlockReader~_fileDescriptor
	 */
	private _fileDescriptor:number = 0;

	/**
	 * Stores the full path to the file to read
	 *
	 * @member {string} core.fs.FileBlockReader~_filePath
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
				if (callback) {
					callback(null);
				}
			});
		}
		else {
			process.nextTick(function () {
				if (callback) {
					callback(new Error('FileBlockReader: Cannot abort closed file block reader'));
				}
			});
		}
	}

	public canBeRead ():boolean {
		return this._canBeRead;
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
					var rawBuffer:Buffer = numOfReadBytes < this._blockSize ? buffer.slice(0, numOfReadBytes) : buffer;

					zlib.deflateRaw(rawBuffer, (err:Error, compressedBuffer:Buffer) => {
						if (err) {
							callback(err, null);
						}
						else {
							callback(null, compressedBuffer);
						}
					});
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

export = DeflatingFileBlockReader;