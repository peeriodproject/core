import ReadableQueryResponseMessageInterface = require('./interfaces/ReadableQueryResponseMessageInterface');
import FeedingNodesMessageBlock = require('./FeedingNodesMessageBlock');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');

/**
 * ReadableQueryResponseMessageInterface implementation.
 *
 * @class core.protocol.fileTransfer.ReadableQueryResponseMessage
 * @implements core.protocol.fileTransfer.ReadableQueryResponseMessageInterface
 *
 * @param {Buffer} buffer The byte buffer to construct the message from.
 */
class ReadableQueryResponseMessage implements ReadableQueryResponseMessageInterface {

	/**
	 * @member {core.protocol.hydra.HydraNodeList} core.protocol.fileTransfer.ReadableQueryResponseMessageInterface~_feedingNodes
	 */
	private _feedingNodes:HydraNodeList = null;

	/**
	 * @member {Buffer} core.protocol.fileTransfer.ReadableQueryResponseMessageInterface~_responseBuffer
	 */
	private _responseBuffer:Buffer = null;

	public constructor (buffer:Buffer) {
		var res:any = FeedingNodesMessageBlock.extractAndDeconstructBlock(buffer);

		this._feedingNodes = res.nodes;
		this._responseBuffer = buffer.slice(res.bytesRead);
	}

	public getFeedingNodes ():HydraNodeList {
		return this._feedingNodes;
	}

	public getResponseBuffer ():Buffer {
		return this._responseBuffer;
	}

}

export = ReadableQueryResponseMessage;