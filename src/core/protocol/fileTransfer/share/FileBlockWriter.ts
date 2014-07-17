import path = require('path');
import crypto = require('crypto');
import fs = require('fs');

import FileBlockWriterInterface = require('./interfaces/FileBlockWriterInterface');

/**
 * FileBlockWriterInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.FileBlockWriter
 * @implements core.protocol.fileTransfer.share.FileBlockWriterInterface
 *
 * @param {string} filename The name of the file to write
 * @param {string} toFolderPath The destination folder of the file to write
 * @param {number} expectedSize Number of expected bytes the file should have
 * @param {string} expectedHash The expected SHA-1 hash of the file to write
 */
class FileBlockWriter implements FileBlockWriterInterface {

	/**
	 * Flag indicating whether the block writer has been aborted.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_aborted
	 */
	private _aborted:boolean = false;

	/**
	 * Flag indicating whether the hash stream has been digested or ended manually.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_hashEnded
	 */
	private _hashEnded:boolean = false;

	/**
	 * Flag indicating whether the file can be written to or not.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_canBeWritten
	 */
	private _canBeWritten:boolean = false;

	/**
	 * Stores the expected SHA-1 hash of the file to write.
	 *
	 * @member {string} core.protocol.fileTransfer.share.FileBlockWriter~_expectedHash
	 */
	private _expectedHash:string = null;

	/**
	 * Stores the expected number of bytes of the file to write.
	 *
	 * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_expectedSize
	 */
	private _expectedSize:number = null;

	/**
	 * Flag indicating whether the destination file has been deleted or not.
	 *
	 * @member {boolean} core.protocol.fileTransfer.share.FileBlockWriter~_fileDeleted
	 */
	private _fileDeleted:boolean = false;

	/**
	 * Stores the file descriptor of the file to write.
	 *
	 * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_fileDescriptor
	 */
	private _fileDescriptor:number = null;

	/**
	 * Keeps track of the number of bytes that have already been written to the file and
	 * thus indicates the position of the first byte of the next block.
	 *
	 * @member {number} core.protocol.fileTransfer.share.FileBlockWriter~_fullCountOfWrittenBytes
	 */
	private _fullCountOfWrittenBytes:number = 0;

	/**
	 * Stores the full path of the file to write.
	 *
	 * @member {string} core.protocol.fileTransfer.share.FileBlockWriter~_fullPath
	 */
	private _fullPath:string = null;

	/**
	 * Stores the SHA-1 hash stream which gets written to from block to block.
	 *
	 * @member {crypto.Hash} core.protocol.fileTransfer.share.FileBlockWriter~_hashStream
	 */
	private _hashStream:crypto.Hash = null;

	public constructor (filename:string, toFolderPath:string, expectedSize:number, expectedHash:string) {
		this._expectedHash = expectedHash;
		this._expectedSize = expectedSize;
		this._fullPath = path.join(toFolderPath, filename);
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public canBeWritten ():boolean {
		return this._canBeWritten;
	}

	public getFileDescriptor ():number {
		return this._fileDescriptor;
	}

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public abort (callback:Function):void {
		this._abort(true, callback);
	}

	public deleteFile (callback:(err:Error) => any):void {
		if (!this._fileDeleted) {
			fs.unlink(this._fullPath, (err:Error) => {
				if (!err) {
					this._fileDeleted = true;
					callback(null);
				}
				else {
					callback(err);
				}
			});
		}
		else {
			process.nextTick(function () {
				callback(null);
			});
		}
	}

	public getFilePath ():string {
		return this._fullPath;
	}

	public prepareToWrite (callback:(err:Error) => any):void {
		fs.open(this._fullPath, 'wx', (err:Error, fd:number) => {
			if (err) {
				callback(err);
			}
			else {
				this._fileDescriptor = fd;
				this._hashStream = crypto.createHash('sha1');
				this._canBeWritten = true;

				callback(null);
			}
		});
	}

	public writeBlock (byteBlock:Buffer, callback:(err:Error, fullCountOfWrittenBytes?:number, isFinished?:boolean) => any):void {
		if (!this._canBeWritten) {
			process.nextTick(function () {
				callback(new Error('FileBlockWriter: Cannot be written to.'));
			});

			return;
		}

		var expectedBytesToWrite:number = byteBlock.length;
		var byteBlockToWrite:Buffer = null;


		if (this._fullCountOfWrittenBytes + expectedBytesToWrite > this._expectedSize) {
			expectedBytesToWrite = this._expectedSize - this._fullCountOfWrittenBytes;
			byteBlockToWrite = byteBlock.slice(0, expectedBytesToWrite);
		}
		else {
			byteBlockToWrite = byteBlock;
		}

		fs.write(this._fileDescriptor, byteBlockToWrite, 0, expectedBytesToWrite, this._fullCountOfWrittenBytes, (err:Error, numOfBytesWritten:number, writtenBuffer:Buffer) => {
			if (err) {
				this._abort(true, () => {
					callback(err);
				});
			}
			else if (numOfBytesWritten !== expectedBytesToWrite) {
				this._abort(true, () => {
					callback(new Error('FileBlockWriter: Could not write all bytes. Aborting.'));
				});
			}
			else {
				this._fullCountOfWrittenBytes += numOfBytesWritten;
				this._hashStream.update(writtenBuffer);

				// check if we are done, if yes, digest hash and callback
				if (this._fullCountOfWrittenBytes === this._expectedSize) {
					// we are done, digest hash
					var calculatedHash:string = this._hashStream.digest('hex');

					this._hashEnded = true;

					if (calculatedHash === this._expectedHash) {
						// file is finished

						this._abort(false, () => {
							callback(null, this._fullCountOfWrittenBytes, true);
						});

					}
					else {
						this._abort(true, () => {
							callback(new Error('FileBlockWriter: Hashes do not match.'), this._fullCountOfWrittenBytes);
						});
					}
				}
				else {
					callback(null, this._fullCountOfWrittenBytes, false);
				}
			}
		});
	}

	/**
	 * Aborts the file transfer and cleans up everything (file descriptor, hash stream), then calls the callback.
	 * Also sets the appropriate flags, so the file can no longer be written to.
	 * If the block writer has already been aborted, immediately calls back and does nothing.
	 *
	 * @method core.protocol.fileTransfer.share.FileBlockWriter~_abort
	 *
	 * @param {boolean} deleteFile Flag indicating whether the destination file should be deleted.
	 * @param {Function} callback Callback function when everything has been cleaned up.
	 */
	private _abort (deleteFile:boolean, callback:Function):void {
		if (!this._aborted) {

			this._aborted = true;
			this._canBeWritten = false;

			if (!this._hashEnded) {
				this._hashEnded = true;
				(<any> this._hashStream).end();
			}

			fs.close(this._fileDescriptor, () => {
				if (deleteFile) {
					this.deleteFile(() => {
						if (callback) {
							callback();
						}
					});
				}
				else {
					if (callback) {
						callback();
					}
				}
			});
		}
		else {
			if (callback) {
				process.nextTick(function () {
					callback();
				});
			}
		}
	}

}

export = FileBlockWriter;