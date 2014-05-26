/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import FindClosestNodesCycleInterface = require('./FindClosestNodesCycleInterface');
import FindClosestNodesManagerInterface = require('./FindClosestNodesManagerInterface');
import IdInterface = require('../../../topology/interfaces/IdInterface');
import ContactNodeListInterface = require('../../../topology/interfaces/ContactNodeListInterface');

/**
 * @interface
 * @class core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface
 */
interface FindClosestNodesCycleFactoryInterface {

	/**
	 * Creates an instance of a FindClosestNodesCycleInterface
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface#create
	 *
	 * @param {core.topology.IdInterface} searchForId Id to search for
	 * @param {core.topology.ContantNodeListInterface} startWithList Near nodes to probe.
	 * @param {Function} callback Callback that should get called when the cycle is finished.
	 */
	create (searchForId:IdInterface, startWithList:ContactNodeListInterface, callback:(resultingList:ContactNodeListInterface) => any):FindClosestNodesCycleInterface;

	/**
	 * Sets the manager.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface#setManager
	 *
	 * @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} manager A FindClosestNodesManager used to get the configuration.
	 */
	setManager (manager:FindClosestNodesManagerInterface):void;
}

export = FindClosestNodesCycleFactoryInterface;