/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeListInterface = require('../../../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../../../topology/interfaces/IdInterface');

/**
 * * A FoundClosestNodesReadableMessage represents an answer message to a FIND_CLOSEST_NODES request.
 * It constitutes itself in the following way:
 *
 * 1.) 20 bytes reserved for the originally searched for ID
 * 2.) A block of close contact nodes:
 * 		* 20 null bytes as a delimiter
 * 		* 20 Bytes for the ID of the node
 * 		* The address block, as in the header {@link core.protocol.messages.ReadableMessageInterface}
 *
 * @interface
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface
 */
interface FoundClosestNodesReadableMessageInterface {

	/**
	 * Discards the payload buffer.
	 *
	 * @method {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface#discard}
	 */
	discard ():void;

	/**
	 * Returns the extracted list of close nodes.
	 *
	 * @method {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface#getFoundNodeList}
	 *
	 * @returns {core.topology.ContactNodeListInterface}
	 */
	getFoundNodeList ():ContactNodeListInterface;

	/**
	 * Returns the extracted original ID that was being searched for.
	 *
	 * @method {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface#getSearchedForId}
	 *
	 * @returns {core.topology.IdInterface}
	 */
	getSearchedForId ():IdInterface;
}

export = FoundClosestNodesReadableMessageInterface;
