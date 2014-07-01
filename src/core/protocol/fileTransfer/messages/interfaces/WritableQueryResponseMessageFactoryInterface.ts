/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('../../../hydra/interfaces/HydraNodeList');

/**
 * Constructs the payload for a QUERY_RESPONSE message
 * For more information on the message format, see {@link core.protocol.fileTransfer.ReadableQueryResponseMessageInterface}
 *
 * @interface
 * @class core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface
 */
interface WritableQueryResponseMessageFactoryInterface {

	/**
	 * Constructs the payload for a QUERY_RESPONSE message
	 *
	 * @method core.protocol.fileTransfer.WritableQueryResponseMessageFactoryInterface#constructMessage
	 *
	 * @param {core.protocol.hydra.HydraNodeList} feedingNodes The nodes for the feeding-nodes-message block
	 * @param {Buffer} responseBuffer The response object as byte buffer.
	 * @returns {Buffer} The resulting payload
	 */
	constructMessage (feedingNodes:HydraNodeList, responseBuffer:Buffer):Buffer;
}

export = WritableQueryResponseMessageFactoryInterface;