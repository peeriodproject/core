import WritableQueryResponseMessageFactoryInterface = require('./interfaces/WritableQueryResponseMessageFactoryInterface');
import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import FeedingNodesMessageBlock = require('./FeedingNodesMessageBlock');

/**
 * WritableQueryResponseMessageFactoryInterface implementation.
 *
 * @class core.protocol.fileTransfer.WritableQueryResponseMessageFactory
 * @implements core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface
 */
class WritableQueryResponseMessageFactory implements WritableQueryResponseMessageFactoryInterface {

	public constructMessage (feedingNodes:HydraNodeList, responseBuffer:Buffer):Buffer {
		return Buffer.concat([FeedingNodesMessageBlock.constructBlock(feedingNodes), responseBuffer]);
	}

}

export = WritableQueryResponseMessageFactory;