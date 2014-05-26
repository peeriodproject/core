/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import IdInterface = require('../../../topology/interfaces/IdInterface');

/**
 *
 * Handles all protocol actions referring to 'FIND_CLOSEST_NODES'.
 * If a 'FIND_CLOSEST_NODES' message comes in, it response with the `k` closest nodes it has knowledge of in a
 * 'FOUND_CLOSEST_NODES' message.
 *
 * If a 'FOUND_CLOSEST_NODES' message comes in, it emits an event with the received node list, so that a potential
 * {@link core.protocol.findClostestNodes.FindClosestNodesCycleInterface} can catch and proces the list.
 *
 * Emits a `foundClosestNodes` event on the finishing of a cycle.
 *
 * @interface
 * @class core.protocol.findClosestNodes.FindClosestNodesManagerInterface
 */
interface FindClosestNodesManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Returns `alpha`, the number of nodes to request in a cycle in one go.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesManagerInterface#getAlpha
	 *
	 * @returns {number}
	 */
	getAlpha ():number;

	/**
	 * Returns the number of milliseconds which indicate how long a cycle should wait when all nodes have been probed
	 * and the confirmed list is not full yet, until the cycle is considered finished.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesManagerInterface#getCycleExpirationMillis
	 *
	 * @returns {number}
	 */
	getCycleExpirationMillis ():number;

	/**
	 * Returns the number of close nodes a cycle should return in the best case.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesManagerInterface#getK
	 *
	 * @returns {number}
	 */
	getK ():number;

	/**
	 * Returns the number of milliseconds which indicate how much time should pass between two alpha-requests in a
	 * FindClosestNodes-cycle.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesManagerInterface#getParallelismDelayMillis
	 *
	 * @returns {number}
	 */
	getParallelismDelayMillis ():number;

	/**
	 * Kicks off a FindClosestNodes cycle for a given ID.
	 *
	 * @param {core.topology.IdInterface} id The ID to search for
	 */
	startCycleFor (id:IdInterface):void;
}

export = FindClosestNodesManagerInterface;