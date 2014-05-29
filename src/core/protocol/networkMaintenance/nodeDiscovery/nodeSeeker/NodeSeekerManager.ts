import NodeSeekerManagerInterface = require('./interfaces/NodeSeekerManagerInterface');
import ProtocolConnectionManagerInterface = require('../../../net/interfaces/ProtocolConnectionManagerInterface');
import ProxyManagerInterface = require('../../../proxy/interfaces/ProxyManagerInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import NodeSeekerFactoryInterface = require('./interfaces/NodeSeekerFactoryInterface');
import NodeSeekerList = require('./interfaces/NodeSeekerList');
import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');

/**
 * NodeSeekerManagerInterface implementation
 *
 * @class core.protocol.nodeDiscovery.NodeSeekerManager
 * @implements core.protocol.nodeDiscovery.NodeSeekerManagerInterface
 *
 * @param {core.protocol.nodeDiscovery.NodeSeekerFactoryInterface} nodeSeekerFactory A node seeker factory which generates NodeSeekers.
 * @oaram {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A working protocol connection manager.
 * @param {core.protocol.proxy.ProxyManagerInterface} proxyManager A working proxy manager.
 */
class NodeSeekerManager implements NodeSeekerManagerInterface {

	/**
	 * Stores the optional node to avoid.
	 *
	 * @member {core.topology.ContactNodeInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_avoidNode
	 */
	private _avoidNode:ContactNodeInterface = null;

	/**
	 * Stores the callback to a force find, if `forceFindActiveNode` has been called before the seeker list could be created.
	 *
	 * @member {Function} core.protocol.nodeDiscovery.NodeSeekerManager~_forceFindCallback
	 */
	private _forceFindCallback:(node:ContactNodeInterface) => any = null;

	/**
	 * Indicator if the search for an active node should be continued.
	 *
	 * @member {boolean} core.protocol.nodeDiscovery.NodeSeekerManager~_forceSearchActive
	 */
	private _forceSearchActive:boolean = false;

	/**
	 * A NodeSeekerFactory
	 *
	 * @member {core.protocol.nodeDiscovery.NodeSeekerFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_nodeSeekerFactory
	 */
	private _nodeSeekerFactory:NodeSeekerFactoryInterface = null;

	/**
	 * The list of NodeSeekers to iterate over.
	 *
	 * @member {core.protocol.nodeDiscovery.NodeSeekerList} core.protocol.nodeDiscovery.NodeSeekerManager~_nodeSeekerList
	 */
	private _nodeSeekerList:NodeSeekerList = null;

	/**
	 * The working ProtocolConnectionManager
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * The working ProxyManager
	 *
	 * @member {core.protocol.oroxy.ProxyManagerInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_proxyManager
	 */
	private _proxyManager:ProxyManagerInterface = null;

	constructor (nodeSeekerFactory:NodeSeekerFactoryInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface) {
		this._protocolConnectionManager = protocolConnectionManager;
		this._nodeSeekerFactory = nodeSeekerFactory;
		this._proxyManager = proxyManager;

		this._nodeSeekerFactory.createSeekerList((list:NodeSeekerList) => {
			this._nodeSeekerList = list;
			if (this._forceFindCallback) {
				this.forceFindActiveNode(this._avoidNode, this._forceFindCallback);
				this._forceFindCallback = null;
			}
		});
	}

	public forceFindActiveNode (avoidNode:ContactNodeInterface, callback:(node:ContactNodeInterface) => any):void {
		this._avoidNode = avoidNode;

		if (!this._nodeSeekerList) {
			this._forceFindCallback = callback;
			return;
		}

		this._forceSearchActive = true;

		this._proxyManager.once('contactNodeInformation', (node:ContactNodeInterface) => {
			this._forceSearchActive = false;

			if (this._avoidNode && this._avoidNode.getId().equals(node.getId())) {
				this.forceFindActiveNode(this._avoidNode, callback);
			}
			else {
				this._avoidNode = null;
				callback(node);
			}
		});

		this._iterativeSeekAndPing();
	}

	/**
	 * Iterates over the list of NodeSeekers and sends PING to the found nodes, until the search has been deactivated.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeekerManager~_iterativeSeekAndPing
	 */
	private _iterativeSeekAndPing ():void {
		process.nextTick(() => {
			if (this._forceSearchActive) {
				for (var i = 0; i < this._nodeSeekerList.length; i++) {
					this._nodeSeekerList[i].seek((node:ContactNodeInterface) => {
						this._pingNodeIfActive(node);
					});
				}
			}
		});
	}

	/**
	 * Sends a PING to a node if the search is active.
	 *
	 * @method core.protocol.nodeDiscovery.NodeSeekerManager~_pingNodeIfActive
	 *
	 * @param {core.topology.ContactNodeInterface} node Node to ping
	 */
	private _pingNodeIfActive (node:ContactNodeInterface):void {
		if (this._forceSearchActive) {
			this._protocolConnectionManager.writeMessageTo(node, 'PING', new Buffer(0));
		}
	}
}

export = NodeSeekerManager;