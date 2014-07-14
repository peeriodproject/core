import ReadableBlockRequestMessageInterface = require('./interfaces/ReadableBlockRequestMessageInterface');
import FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
 * ReadableBlockRequestMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableBlockRequestMessage
 * @implements core.protocol.fileTransfer.share.ReadableBlockRequestMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to construct the message from.
 */
class ReadableBlockRequestMessage implements ReadableBlockRequestMessageInterface {

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_feedingNodesBlock
	 */
	private _feedingNodesBlock:Buffer = null;

	/**
	 * @member {number} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_firstBytePositionOfBlock
	 */
	private _firstBytePositionOfBlock:number = 0;

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableBlockRequestMessage~_naxtTransferIdentifier
	 */
	private _nextTransferIdentifier:string = null;

	public constructor (buffer:Buffer) {
		var feedingNodesBlockObject:any = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);
		var bytesRead:number = feedingNodesBlockObject.bytesRead;

		this._feedingNodesBlock = buffer.slice(0, bytesRead);

		this._firstBytePositionOfBlock = buffer.readUInt32BE(bytesRead) * 1000 + buffer.readUInt32BE(bytesRead + 4);

		this._nextTransferIdentifier = buffer.slice(bytesRead + 8).toString('hex');
	}

	public getFeedingNodesBlock ():Buffer {
		return this._feedingNodesBlock;
	}

	public getFirstBytePositionOfBlock ():number {
		return this._firstBytePositionOfBlock;
	}

	public getNextTransferIdentifier ():string {
		return this._nextTransferIdentifier;
	}

}

export = ReadableBlockRequestMessage;