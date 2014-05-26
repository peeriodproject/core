import events = require('events');

import FindClosestNodesManagerInterface = require('./interfaces/FindClosestNodesManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import ProxyManagerInterface = require('../proxy/interfaces/ProxyManagerInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import FoundClosestNodesReadableMessageInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageInterface');
import FoundClosestNodesReadableMessageFactoryInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageFactoryInterface');
import FoundClosestNodesReadableMessageFactory = require('./messages/FoundClosestNodesReadableMessageFactory');
import FoundClosestNodesWritableMessageFactoryInterface = require('./messages/interfaces/FoundClosestNodesWritableMessageFactoryInterface');
import FoundClosestNodesWritableMessageFactory = require('./messages/FoundClosestNodesWritableMessageFactory');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');
import FindClosestNodesCycleFactoryInterface = require('./interfaces/FindClosestNodesCycleFactoryInterface');
import FindClosestNodesCycleFactory = require('./FindClosestNodesCycleFactory');

/**
 *
 * @class core.protocol.findClosestNodes.FindClosestNodesManager
 * @implements core.protocol.findClosestNodes.FindClosestNodesManagerInterface
 *
 * FindClosestNodesManagerInterface implementation.
 *
 * @param {core.config.ConfigInterface} topologyConfig Configuration object of the topology namespace.
 * @param {core.config.ConfigInterface} protocolConfig Configuration object of the protocol namespace.
 * @param {core.topology.MyNodeInterface} myNode My node.
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager instance.
 * @param {core.protocol.proxy.ProxyManagerInterface} proxyManager A working proxy manager instance.
 * @param {core.protocol.topology.RoutingTableInterface} routingtable A routing table.
 * @param {core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface} findClosestNodesCycleFactory A cycle factory.
 * @param {core.protocol.findClosestNodes.FoundClosestNodesWritableMessageFactoryInterface} writableMessageFactory A found closest nodes writable message factory.
 * @param {core.protocol.findClosestNodes.FoundClosestNodesReadableMessageFactoryInterface} readableMessageFactory A found closest nodes readable message factory.
 */
class FindClosestNodesManager extends events.EventEmitter implements FindClosestNodesManagerInterface {

	/**
	 * Number indicating how many nodes to request in a cycle in one go.
	 *
	 * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_alpha
	 */
	_alpha:number = 0;

	/**
	 * Milliseconds indicating how long a cycle should wait when all nodes have been probed and the
	 * confirmed list is not full yet, until the cycle is considered finished.
	 *
	 * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_cycleExpirationMillis
	 */
	_cycleExpirationMillis:number = 0;

	/**
	 * @member {core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_findClosestNodesCycleFactory
	 */
	_findClosestNodesCycleFactory:FindClosestNodesCycleFactoryInterface = null;

	/**
	 * Number of nodes a cycle should return in the best case, and how many nodes one should return when being requested.
	 *
	 * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_k
	 */
	_k:number = 0;

	/**
	 * @member {core.topology.MyNodeInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_myNode
	 */
	_myNode:MyNodeInterface = null;

	/**
	 * Milliseconds indicating how much time should pass between two alpha-requests in a cycle.
	 *
	 * @member {number} core.protocol.findClosestNodes.FindClosestNodesManager~_parallelismDelayMillis
	 */
	_parallelismDelayMillis:number = 0;

	/**
	 * An array keeping track of the IDs being currently searched for.
	 *
	 * @member {Array<string>} core.protocol.findClosestNodes.FindClosestNodesManager~_pendingCycles
	 */
	_pendingCycles:Array<string> = [];

	/**
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_protocolConnectionManager
	 */
	_protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * @member {core.protocol.proxy.ProxyManagerInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_proxyManager
	 */
	_proxyManager:ProxyManagerInterface = null;

	/**
	 * A readable message factory for incoming 'FOUND_CLOSEST_NODES' messages
	 *
	 * @member {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_readableMessageFactory
	 */
	_readableMessageFactory:FoundClosestNodesReadableMessageFactoryInterface = null;

	/**
	 * @member {core.topology.RoutingTableInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_routingTable
	 */
	_routingTable:RoutingTableInterface = null;

	/**
	 * A writable message factory for outgoing 'FOUND_CLOSEST_NODES' messages
	 *
	 * @member {core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface} core.protocol.findClosestNodes.FindClosestNodesManager~_writableMessageFactory
	 */
	_writableMessageFactory:FoundClosestNodesWritableMessageFactoryInterface = null;


	constructor (topologyConfig:ConfigInterface, protocolConfig:ConfigInterface, myNode:MyNodeInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface,
		routingTable:RoutingTableInterface, findClosestNodesCycleFactory:FindClosestNodesCycleFactoryInterface, writableMessageFactory:FoundClosestNodesWritableMessageFactoryInterface,
		readableMessageFactory:FoundClosestNodesReadableMessageFactoryInterface) {

		super();

		this._k = topologyConfig.get('topology.k');
		this._alpha = topologyConfig.get('topology.alpha');
		this._cycleExpirationMillis = protocolConfig.get('protocol.findClosestNodes.cycleExpirationInSeconds') * 1000;
		this._parallelismDelayMillis = protocolConfig.get('protocol.findClosestNodes.parallelismDelayInSeconds') * 1000;

		this._myNode = myNode;
		this._protocolConnectionManager = protocolConnectionManager;
		this._proxyManager = proxyManager;
		this._routingTable = routingTable;
		this._findClosestNodesCycleFactory = findClosestNodesCycleFactory;
		this._findClosestNodesCycleFactory.setManager(this);

		this._writableMessageFactory = writableMessageFactory;
		this._readableMessageFactory = readableMessageFactory;

		this._setupListeners();
	}

	public getAlpha ():number {
		return this._alpha;
	}

	public getCycleExpirationMillis ():number {
		return this._cycleExpirationMillis;
	}

	public getK ():number {
		return this._k;
	}

	public getParallelismDelayMillis ():number {
		return this._parallelismDelayMillis;
	}

	/**
	 * Testing purposes only. Should not be used in production.
	 */
	public getPendingCycles ():Array<string> {
		return this._pendingCycles;
	}

	public startCycleFor (searchForId:IdInterface):void {
		this._routingTable.getClosestContactNodes (searchForId, null, (err:Error, contacts:ContactNodeListInterface) => {
			if (!err && contacts && contacts.length) {

				var identifier:string = searchForId.toHexString();

				if (this._pendingCycles.indexOf(identifier) === -1) {

					var startWithList:ContactNodeListInterface = contacts.splice(0, Math.min(contacts.length, this._alpha));

					this._pendingCycles.push(identifier);

					this._findClosestNodesCycleFactory.create(searchForId, startWithList, (resultingList:ContactNodeListInterface) => {

						this._pendingCycles.splice(this._pendingCycles.indexOf(identifier), 1);

						this.emit('foundClosestNodes', searchForId, resultingList);
					});
				}

			}
		});
	}

	/**
	 * Generates a 'FOUND_CLOSEST_NODES' reply for a given searched for ID and sends it back to the requesting node,
	 * by trying to get the maximum `k` closest nodes to the given ID the routing table has knowledge of.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesManager~_replyToFindNodesFor
	 *
	 * @param {core.topology.ContactNodeInterface} requestingNode
	 * @param {core.topology.IdInterface} searchForId
	 */
	private _replyToFindNodesFor (requestingNode:ContactNodeInterface, searchForId:IdInterface):void {
		if (this._myNode.getId().equals(searchForId)) {
			var idBuffer = searchForId.getBuffer();
			idBuffer[19] === 0xff ? idBuffer[19]-- : idBuffer[19]++;
		}

		this._routingTable.getClosestContactNodes (searchForId, requestingNode.getId(), (err:Error, contacts:ContactNodeListInterface) => {
			if (!err && contacts && contacts.length) {
				var payload:Buffer = null;
				try {
					payload = this._writableMessageFactory.constructPayload(searchForId, contacts);
				}
				catch (e) {}

				if (payload) {
					this._protocolConnectionManager.writeMessageTo(requestingNode, 'FOUND_CLOSEST_NODES', payload);
				}
			}
		});
	}

	/**
	 * Sets up the listeners on the message events. 'FOUND_CLOSEST_NODES' emits merely an event constituted by the hex string
	 * representation of the searched for ID, with the list of received nodes as arguments, so that a protential FindClosestNodesCycle
	 * can process it.
	 *
	 * @member core.protocol.findClosestNodes.FindClosestNodesManager~_setupListeners
	 */
	private _setupListeners ():void {

		this._proxyManager.on('message', (message:ReadableMessageInterface) => {
			var type:string = message.getMessageType();

			if (type === 'FIND_CLOSEST_NODES') {
				var id:IdInterface = null;

				try {
					id = new Id(message.getPayload(), 160);
				}
				catch (e) {}

				if (id) {
					this._replyToFindNodesFor(message.getSender(), id);
				}
			}
			else if (type === 'FOUND_CLOSEST_NODES') {
				var foundClosestNodesMsg:FoundClosestNodesReadableMessageInterface = null
				try {
					foundClosestNodesMsg = this._readableMessageFactory.create(message.getPayload());
				}
				catch (e) {}

				if (foundClosestNodesMsg) {
					this.emit(foundClosestNodesMsg.getSearchedForId().toHexString(), message.getSender(), foundClosestNodesMsg);
				}
			}
		});
	}

}

export = FindClosestNodesManager;