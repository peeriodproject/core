import ReadableShareRatifyMessageInterface = require('./interfaces/ReadableShareRatifyMessageInterface');
import FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
 * ReadableShareRatifyMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareRatifyMessage
 * @implements core.protocol.fileTransfer.share.ReadableShareRatifyMessageInterface
 */
class ReadableShareRatifyMessage implements ReadableShareRatifyMessageInterface {

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_dhPayload
	 */
	private _dhPayload:Buffer = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_encryptedPart
	 */
	private _encryptedPart:Buffer = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_feedingNodesBlock
	 */
	private _feedingNodesBlock:Buffer = null;

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_filename
	 */
	private _filename:string = null;

	/**
	 * @member {number} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_filesize
	 */
	private _filesize:number = 0;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRatifyMessage~_secretHash
	 */
	private _secretHash:Buffer = null;


	public constructor (buffer:Buffer) {

		this._dhPayload = buffer.slice(0, 256);

		if (this._dhPayload.length !== 256) {
			throw new Error('ReadableShareRatifyMessage: Diffie-Hellman bad length! Expected 256 bytes.');
		}

		this._secretHash = buffer.slice(256, 276);

		if (this._secretHash.length !== 20) {
			throw new Error('ReadableShareRatifyMessage: Secret hash bad length! Expected 20 bytes (SHA-1)');
		}

		this._encryptedPart = buffer.slice(276);
	}

	public deformatDecryptedPart (decryptedBuffer:Buffer):void {
		var feedingNodesBlockObject:any = FeedingNodesMessageBlock.extractAndDeconstructBlock(decryptedBuffer);
		var bytesRead:number = feedingNodesBlockObject.bytesRead;

		this._feedingNodesBlock = decryptedBuffer.slice(0, bytesRead);
		this._filesize = decryptedBuffer.readUInt32BE(bytesRead) * 1000 + decryptedBuffer.readUInt32BE(bytesRead + 4);
		this._filename = decryptedBuffer.slice(bytesRead + 8).toString('utf8');
	}

	public getDeformattedDecryptedFeedingNodesBlock ():Buffer {
		return this._feedingNodesBlock;
	}

	public getDeformattedDecryptedFilename ():string {
		return this._filename;
	}

	public getDeformattedDecryptedFileSize ():number {
		return this._filesize;
	}

	public getDHPayload ():Buffer {
		return this._dhPayload;
	}

	public getEncryptedPart ():Buffer {
		return this._encryptedPart;
	}

	public getSecretHash ():Buffer {
		return this._secretHash;
	}
}

export = ReadableShareRatifyMessage;