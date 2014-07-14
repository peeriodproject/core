import ReadableShareAbortMessageInterface = require('./interfaces/ReadableShareAbortMessageInterface');

/**
 * ReadableShareAbortMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareAbortMessage
 * @implements core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to create the message from
 */
class ReadableShareAbortMessage implements ReadableShareAbortMessageInterface {

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filehash
	 */
	private _filehash:string = null;

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filename
	 */
	private _filename:string = null;

	/**
	 * @member {number} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filesize
	 */
	private _filesize:number = 0;

	public constructor (buffer:Buffer) {
		this._filesize = buffer.readUInt32BE(0) * 1000 + buffer.readUInt32BE(4);
		this._filehash = buffer.slice(8, 28).toString('hex');
		this._filename = buffer.slice(28).toString('utf8');
	}

	public getFileHash ():string {
		return this._filehash;
	}

	public getFilename ():string {
		return this._filename;
	}

	public getFilesize ():number {
		return this._filesize;
	}
}

export = ReadableShareAbortMessage;