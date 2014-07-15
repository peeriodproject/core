import path = require('path');
import crypto = require('crypto');
import fs = require('fs');

import FileBlockWriterInterface = require('./interfaces/FileBlockWriterInterface');

class FileBlockWriter implements FileBlockWriterInterface {

	private _fullPath:string = null;
	private _expectedSize:number = null;
	private _expectedHash:string = null;
	private _canBeWritten:boolean = false;
	private _hashStream:crypto.Hash = null;
	private _fileDescriptor:number = null;
	private _writePosition:number = 0;
	private _fullCountOfWrittenBytes:number = 0;
	private _aborted:boolean = false;
	private _hashEnded:boolean = false;

	public constructor (filename:string, toFolderPath:string, expectedSize:number, expectedHash:string) {
		this._expectedHash = expectedHash;
		this._expectedSize = expectedSize;
		this._fullPath = path.join(toFolderPath, filename);
	}

	public abort (callback:Function):void {
		this._abort(true, callback);
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
					fs.unlink(this._fullPath, () => {
						callback();
					});
				}
				else {
					callback();
				}
			});
		}
		else {
			callback();
		}
	}

	public writeBlock (byteBlock:Buffer, callback:(err:Error, fullCountOfWrittenBytes?:number, isFinished?:boolean, positionOfFirstByteInNextBlock?:number) => any):void {
		if (!this._canBeWritten) {
			callback(new Error('FileBlockWriter: Cannot be written to.'));
			return;
		}

		var expectedBytesToWrite:number = byteBlock.length;
		var byteBlockToWrite:Buffer = null;


		if (this._fullCountOfWrittenBytes + expectedBytesToWrite > this._expectedSize) {
			byteBlockToWrite = byteBlock.slice(0, this._expectedSize - expectedBytesToWrite);
		}
		else {
			byteBlockToWrite = byteBlock;
		}

		fs.write(this._fileDescriptor, byteBlockToWrite, 0, expectedBytesToWrite, this._writePosition, (err:Error, numOfBytesWritten:number, writtenBuffer:Buffer) => {
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
							callback(new Error('FileBlockWriter: Hashes do not match.'));
						});
					}
				}
				else {
					this._writePosition = this._fullCountOfWrittenBytes + 1;
					callback(null, this._fullCountOfWrittenBytes, false, this._writePosition);
				}
			}
		});

	}

}

export = FileBlockWriter;