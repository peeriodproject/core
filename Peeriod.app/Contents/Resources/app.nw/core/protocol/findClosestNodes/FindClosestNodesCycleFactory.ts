import FindClosestNodesCycleFactoryInterface = require('./interfaces/FindClosestNodesCycleFactoryInterface');
import FindClosestNodesManagerInterface = require('./interfaces/FindClosestNodesManagerInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import FindClosestNodesCycleInterface = require('./interfaces/FindClosestNodesCycleInterface');
import FindClosestNodesCycle = require('./FindClosestNodesCycle');
import IdInterface = require('../../topology/interfaces/IdInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');

/**
 * @class core.protocol.findClosestNodes.FindClosestNodesCycleFactory
 * @implements core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface
 *
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager
 */
class FindClosestNodesCycleFactory implements FindClosestNodesCycleFactoryInterface {

	/**
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycleFactory~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycleFactory~_findClosestNodesManager
	 */
	private _findClosestNodesManager:FindClosestNodesManagerInterface = null;

	/**
	 * @member {core.topology.MyNodeInterface} core.protocol.findClosestNodes.FindClosestNodesCycleFactory~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	constructor (myNode:MyNodeInterface, protocolConnectionManager:ProtocolConnectionManagerInterface) {
		this._myNode = myNode;
		this._protocolConnectionManager = protocolConnectionManager;
	}

	public create (searchForId:IdInterface, startWithList:ContactNodeListInterface, callback:(resultingList:ContactNodeListInterface) => any):FindClosestNodesCycleInterface {

		return new FindClosestNodesCycle(this._myNode, searchForId, startWithList, this._findClosestNodesManager, this._protocolConnectionManager, callback);
	}

	public setManager (manager:FindClosestNodesManagerInterface):void {
		this._findClosestNodesManager = manager;
	}

}

export = FindClosestNodesCycleFactory;