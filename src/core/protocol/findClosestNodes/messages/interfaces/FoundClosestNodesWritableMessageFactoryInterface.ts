/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import IdInterface = require('../../../../topology/interfaces/IdInterface');
import ContactNodeListInterface = require('../../../../topology/interfaces/ContactNodeListInterface');

/**
 * Used to construct a response to a FIND_CLOSEST_NODES request. For detailed information of what such a
 * message's payload consists of, see {@link core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface}.
 *
 * @interface
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface
 */
interface FoundClosestNodesWritableMessageFactoryInterface {

	/**
	 * Constructs the payload (as Buffer).
	 *
	 * @method core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface#constructPayload
	 *
	 * @param {core.topology.IdInterface} searchedForId The originally searched for ID
	 * @param {core.topology.ContactNodeListInterface} nodeList A list of closest nodes.
	 *
	 * @returns {Buffer} The resulting payload.
	 */
	constructPayload (searchedForId:IdInterface, nodeList:ContactNodeListInterface):Buffer;
}

export = FoundClosestNodesWritableMessageFactoryInterface;