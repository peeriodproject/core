import ReadableShareRequestMessageInterface = require('./interfaces/ReadableShareRequestMessageInterface');
import FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
 * ReadableShareRequestMessageInterface implementation.
 * For more information about how a SHARE_REQUEST message is constituted, see the interface.
 *
 * @class core.protocol.fileTransfer.share.ReadableShareRequestMessage
 * @implements core.protocol.fileTransfer.share.ReadableShareRequestMessageInterface
 *
 * @param {Buffer} buffer The buffer to construct the message from
 */
class ReadableShareRequestMessage implements ReadableShareRequestMessageInterface {

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_dhPayload
	 */
	private _dhPayload:Buffer = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_feedingNodesBlock
	 */
	private _feedingNodesBlock:Buffer = null;

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableShareRequestMessage~_fileHash
	 */
	private _fileHash:string = null;

	public constructor (buffer:Buffer) {

		var feedingNodesReponseObj:any = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);

		var bytesRead:number = feedingNodesReponseObj.bytesRead;

		this._feedingNodesBlock = buffer.slice(0, bytesRead);
		this._fileHash = buffer.slice(bytesRead, bytesRead + 20).toString('hex');
		this._dhPayload = buffer.slice(bytesRead + 20);

		if (this._dhPayload.length !== 256) {
			throw new Error('ReadableShareRequestMessage: Diffie-Hellman bad length, expected 256 bytes!');
		}
	}

	public getDHPayload ():Buffer {
		return this._dhPayload;
	}

	public getFeedingNodesBlock ():Buffer {
		return this._feedingNodesBlock;
	}

	public getFileHash ():string {
		return this._fileHash;
	}

}

export = ReadableShareRequestMessage;