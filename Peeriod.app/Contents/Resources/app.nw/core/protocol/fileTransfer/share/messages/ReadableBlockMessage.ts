import ReadableBlockMessageInterface = require('./interfaces/ReadableBlockMessageInterface');
import FeedingNodesMessageBlock = require('../../messages/FeedingNodesMessageBlock');

/**
 * ReadableBlockMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.share.ReadableBlockMessage
 * @implements core.protocol.fileTransfer.share.ReadableBlockMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to construct the message from.
 */
class ReadableBlockMessage implements ReadableBlockMessageInterface {

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockMessage~_dataBlock
	 */
	private _dataBlock:Buffer = null;

	/**
	 * @member {number} core.protocol.fileTransfer.share.ReadableBlockMessage~_firstBytePositionOfBlock
	 */
	private _firstBytePositionOfBlock:number = 0;

	/**
	 * @member {string} core.protocol.fileTransfer.share.ReadableBlockMessage~_nextTransferIdentifier
	 */
	private _nextTransferIdentifier:string = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.share.ReadableBlockMessage~_feedingNodesBlock
	 */
	private _feedingNodesBlock:Buffer = null;

	public constructor (buffer:Buffer) {
		var feedingNodesBlockObject:any = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);
		var bytesRead:number = feedingNodesBlockObject.bytesRead;

		this._feedingNodesBlock = buffer.slice(0, bytesRead);

		this._firstBytePositionOfBlock = buffer.readUInt32BE(bytesRead) * 1000 + buffer.readUInt32BE(bytesRead + 4);
		this._nextTransferIdentifier = buffer.slice(bytesRead + 8, bytesRead + 24).toString('hex');

		if (this._nextTransferIdentifier.length !== 32) {
			throw new Error('ReadableBlockMessage: Next transfer identifier bad length. Expected 16 bytes.');
		}

		this._dataBlock = buffer.slice(bytesRead + 24);
	}

	public getDataBlock ():Buffer {
		return this._dataBlock;
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

export = ReadableBlockMessage;