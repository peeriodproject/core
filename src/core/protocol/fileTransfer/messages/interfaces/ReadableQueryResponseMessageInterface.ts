/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import HydraNodeList = require('../../../hydra/interfaces/HydraNodeList');

/**
 * The class represents QUERY_RESPONSE messages.
 * It consists of a feeding-nodes-block and is followed directly be the response object.
 * QUERY_RESPONSE messages are typically relayed back to the initiator of a query through a circuit.
 *
 * @interface
 * @class core.protocol.fileTransfer.ReadableQueryResponseMessageInterface
 */
interface ReadableQueryResponseMessageInterface {

	/**
	 * Returns the feeding nodes extracted from the block at the beginning of the message payload.
	 *
	 * @method core.protocol.fileTransfer.ReadableQueryResponseMessageInterface#getFeedingNodes
	 *
	 * @returns {core.protocol.hydra.HydraNodeList}
	 */
	getFeedingNodes ():HydraNodeList;

	/**
	 * Returns the actual response object as a buffer.
	 *
	 * @method core.protocol.fileTransfer.ReadableQueryResponseMessageInterface#getResponseBuffer
	 *
	 * @returns {Buffer}
	 */
	getResponseBuffer ():Buffer;
}

export = ReadableQueryResponseMessageInterface;