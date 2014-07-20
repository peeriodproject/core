import fs = require('fs');

import FileBlockReaderInterface = require('./interfaces/FileBlockReaderInterface');

class FileBlockReader implements FileBlockReaderInterface {

	private _blockSize:number = 0;
	private _filePath:string = null;
	private _fileDescriptor:number = 0;
	private _canBeRead:boolean = false;

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
		} else {
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
		fs.read(this._fileDescriptor, new Buffer(this._blockSize), 0, this._blockSize, fromPosition, (err:Error, numOfReadBytes:number, buffer:Buffer) => {
			if (err) {
				callback(err, null);
			}
			else {
				callback(null, numOfReadBytes < this._blockSize ? buffer.slice(0, numOfReadBytes) : buffer);
			}
		});
	}

}

export = FileBlockReader;