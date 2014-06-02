import NodeSeekerManagerInterface = require('./interfaces/NodeSeekerManagerInterface');
import ProtocolConnectionManagerInterface = require('../../../net/interfaces/ProtocolConnectionManagerInterface');
import ProxyManagerInterface = require('../../../proxy/interfaces/ProxyManagerInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import MyNodeInterface = require('../../../../topology/interfaces/MyNodeInterface');
import NodeSeekerFactoryInterface = require('./interfaces/NodeSeekerFactoryInterface');
import NodeSeekerList = require('./interfaces/NodeSeekerList');
import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');

var logger = require('../../../../utils/logger/LoggerFactory').create();

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
	 * My node instance
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.NodeSeekerManager~_myNode
	 */
	private _myNode:MyNodeInterface = null;

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

	private _iterativeSeekTimeout:number = 0;

	constructor (myNode:MyNodeInterface, nodeSeekerFactory:NodeSeekerFactoryInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, proxyManager:ProxyManagerInterface) {
		this._myNode = myNode;
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

			logger.info('got contact node information');

			this._forceSearchActive = false;

			if (this._avoidNode && this._avoidNode.getId().equals(node.getId())) {
				setImmediate(() => {
					this.forceFindActiveNode(this._avoidNode, callback);
				});
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
		if (this._forceSearchActive) {
			logger.info('searching for node cycle', {listlen: this._nodeSeekerList.length});

			setImmediate(() => {
				for (var i = 0; i < this._nodeSeekerList.length; i++) {


					this._nodeSeekerList[i].seek((node:ContactNodeInterface) => {

						if (node && !node.getId().equals(this._myNode.getId())) {

							logger.info('found potential node', {id: node.getId().toHexString()});

							if (this._iterativeSeekTimeout) {
								clearTimeout(this._iterativeSeekTimeout);
								this._iterativeSeekTimeout = 0;
							}

							this._pingNodeIfActive(node);
						}
					});
				}

				this._iterativeSeekTimeout = setTimeout(() => {
					this._iterativeSeekAndPing();
				}, 1500);

			});
		}

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